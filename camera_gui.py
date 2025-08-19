#!/usr/bin/env python3
"""
OSINT Camera GUI
================

Graphical user interface for the OSINT Camera Discovery Tool
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog, messagebox
import threading
import json
from datetime import datetime
import webbrowser
import os
from osint_camera_tool import OSINTCameraFinder
from camera_sources import CameraSources, CameraValidator

class CameraGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("OSINT Camera Discovery Tool")
        self.root.geometry("1200x800")
        
        # Initialize components
        self.camera_finder = OSINTCameraFinder()
        self.camera_sources = CameraSources()
        self.camera_validator = CameraValidator()
        
        self.cameras = []
        self.filtered_cameras = []
        
        self.setup_gui()
        
    def setup_gui(self):
        """Setup the GUI components"""
        
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(2, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="OSINT Camera Discovery Tool", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Search controls frame
        search_frame = ttk.LabelFrame(main_frame, text="Search Options", padding="10")
        search_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        search_frame.columnconfigure(1, weight=1)
        
        # Shodan API key
        ttk.Label(search_frame, text="Shodan API Key:").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        self.shodan_key_var = tk.StringVar()
        shodan_entry = ttk.Entry(search_frame, textvariable=self.shodan_key_var, width=40, show="*")
        shodan_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 10))
        
        # IP address to scan
        ttk.Label(search_frame, text="Scan IP:").grid(row=1, column=0, sticky=tk.W, padx=(0, 10), pady=(5, 0))
        self.scan_ip_var = tk.StringVar()
        ip_entry = ttk.Entry(search_frame, textvariable=self.scan_ip_var, width=20)
        ip_entry.grid(row=1, column=1, sticky=tk.W, padx=(0, 10), pady=(5, 0))
        
        # Search options
        self.public_feeds_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(search_frame, text="Include Public Feeds", 
                       variable=self.public_feeds_var).grid(row=2, column=0, sticky=tk.W, pady=(10, 0))
        
        self.validate_cameras_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(search_frame, text="Validate Camera URLs", 
                       variable=self.validate_cameras_var).grid(row=2, column=1, sticky=tk.W, pady=(10, 0))
        
        # Search button
        search_btn = ttk.Button(search_frame, text="Start Search", command=self.start_search)
        search_btn.grid(row=0, column=2, rowspan=2, padx=(10, 0))
        
        # Results frame
        results_frame = ttk.LabelFrame(main_frame, text="Search Results", padding="10")
        results_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        results_frame.columnconfigure(0, weight=1)
        results_frame.rowconfigure(1, weight=1)
        
        # Filter frame
        filter_frame = ttk.Frame(results_frame)
        filter_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        filter_frame.columnconfigure(1, weight=1)
        
        ttk.Label(filter_frame, text="Filter:").grid(row=0, column=0, padx=(0, 10))
        self.filter_var = tk.StringVar()
        filter_entry = ttk.Entry(filter_frame, textvariable=self.filter_var)
        filter_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 10))
        filter_entry.bind('<KeyRelease>', self.filter_cameras)
        
        ttk.Button(filter_frame, text="Clear Filter", command=self.clear_filter).grid(row=0, column=2)
        
        # Camera list
        self.setup_camera_tree(results_frame)
        
        # Status frame
        status_frame = ttk.Frame(main_frame)
        status_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(10, 0))
        status_frame.columnconfigure(0, weight=1)
        
        self.status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(status_frame, textvariable=self.status_var)
        status_label.grid(row=0, column=0, sticky=tk.W)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(status_frame, variable=self.progress_var, mode='determinate')
        self.progress_bar.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(10, 0))
        
        # Buttons frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.grid(row=4, column=0, columnspan=3, pady=(10, 0))
        
        ttk.Button(buttons_frame, text="Export Results", command=self.export_results).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(buttons_frame, text="View Camera", command=self.view_selected_camera).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(buttons_frame, text="Copy URL", command=self.copy_camera_url).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(buttons_frame, text="Clear Results", command=self.clear_results).pack(side=tk.LEFT)
        
    def setup_camera_tree(self, parent):
        """Setup the camera results tree view"""
        
        # Create treeview
        columns = ('Name', 'URL', 'Location', 'Type', 'Source')
        self.camera_tree = ttk.Treeview(parent, columns=columns, show='tree headings', height=15)
        
        # Configure columns
        self.camera_tree.heading('#0', text='#')
        self.camera_tree.column('#0', width=50, minwidth=50)
        
        for col in columns:
            self.camera_tree.heading(col, text=col)
            self.camera_tree.column(col, width=150, minwidth=100)
        
        # Scrollbars
        v_scrollbar = ttk.Scrollbar(parent, orient=tk.VERTICAL, command=self.camera_tree.yview)
        h_scrollbar = ttk.Scrollbar(parent, orient=tk.HORIZONTAL, command=self.camera_tree.xview)
        self.camera_tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Grid layout
        self.camera_tree.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        v_scrollbar.grid(row=1, column=1, sticky=(tk.N, tk.S))
        h_scrollbar.grid(row=2, column=0, sticky=(tk.W, tk.E))
        
        # Bind double-click
        self.camera_tree.bind('<Double-1>', lambda e: self.view_selected_camera())
        
    def start_search(self):
        """Start camera search in a separate thread"""
        
        # Disable search button
        search_btn = None
        for child in self.root.winfo_children():
            if isinstance(child, ttk.Frame):
                for subchild in child.winfo_children():
                    if isinstance(subchild, ttk.LabelFrame) and "Search Options" in str(subchild):
                        for btn in subchild.winfo_children():
                            if isinstance(btn, ttk.Button) and btn.cget('text') == 'Start Search':
                                search_btn = btn
                                break
        
        if search_btn:
            search_btn.config(state='disabled')
        
        # Start search thread
        search_thread = threading.Thread(target=self.perform_search)
        search_thread.daemon = True
        search_thread.start()
        
    def perform_search(self):
        """Perform the camera search"""
        
        try:
            self.status_var.set("Searching for cameras...")
            self.progress_var.set(0)
            
            all_cameras = []
            
            # Public feeds
            if self.public_feeds_var.get():
                self.status_var.set("Getting public camera feeds...")
                self.progress_var.set(25)
                
                public_cameras = self.camera_sources.get_all_public_sources()
                all_cameras.extend(public_cameras)
                
            # Shodan search
            shodan_key = self.shodan_key_var.get().strip()
            if shodan_key:
                self.status_var.set("Searching Shodan...")
                self.progress_var.set(50)
                
                shodan_cameras = self.camera_finder.search_shodan_cameras(shodan_key)
                all_cameras.extend(shodan_cameras)
                
            # IP scan
            scan_ip = self.scan_ip_var.get().strip()
            if scan_ip:
                self.status_var.set(f"Scanning IP {scan_ip}...")
                self.progress_var.set(75)
                
                ip_cameras = self.camera_finder.scan_ip_for_cameras(scan_ip)
                all_cameras.extend(ip_cameras)
            
            # Validate cameras if requested
            if self.validate_cameras_var.get() and all_cameras:
                self.status_var.set("Validating camera URLs...")
                self.progress_var.set(90)
                
                # Extract URLs for validation
                urls_to_validate = []
                for camera in all_cameras:
                    if 'url' in camera:
                        urls_to_validate.append(camera['url'])
                
                valid_urls = self.camera_validator.batch_validate(urls_to_validate)
                
                # Filter cameras to only include valid ones
                all_cameras = [camera for camera in all_cameras 
                              if camera.get('url') in valid_urls or 'url' not in camera]
            
            self.cameras = all_cameras
            self.filtered_cameras = all_cameras.copy()
            
            # Update GUI in main thread
            self.root.after(0, self.update_camera_list)
            self.root.after(0, lambda: self.status_var.set(f"Found {len(all_cameras)} cameras"))
            self.root.after(0, lambda: self.progress_var.set(100))
            
        except Exception as e:
            self.root.after(0, lambda: self.status_var.set(f"Error: {str(e)}"))
            self.root.after(0, lambda: messagebox.showerror("Search Error", f"An error occurred during search:\n{str(e)}"))
        
        finally:
            # Re-enable search button
            self.root.after(0, self.enable_search_button)
            
    def enable_search_button(self):
        """Re-enable the search button"""
        for child in self.root.winfo_children():
            if isinstance(child, ttk.Frame):
                for subchild in child.winfo_children():
                    if isinstance(subchild, ttk.LabelFrame) and "Search Options" in str(subchild):
                        for btn in subchild.winfo_children():
                            if isinstance(btn, ttk.Button) and btn.cget('text') == 'Start Search':
                                btn.config(state='normal')
                                break
    
    def update_camera_list(self):
        """Update the camera list display"""
        
        # Clear existing items
        for item in self.camera_tree.get_children():
            self.camera_tree.delete(item)
        
        # Add cameras
        for i, camera in enumerate(self.filtered_cameras, 1):
            name = camera.get('name', 'Unknown Camera')
            url = camera.get('url', 'N/A')
            location = self.format_location(camera.get('location', 'Unknown'))
            cam_type = camera.get('type', 'Unknown')
            source = camera.get('source', 'Unknown')
            
            self.camera_tree.insert('', 'end', text=str(i), 
                                   values=(name, url, location, cam_type, source))
    
    def format_location(self, location):
        """Format location information"""
        if isinstance(location, dict):
            city = location.get('city', '')
            country = location.get('country', '')
            if city and country:
                return f"{city}, {country}"
            return city or country or 'Unknown'
        return str(location)
    
    def filter_cameras(self, event=None):
        """Filter cameras based on search term"""
        
        filter_term = self.filter_var.get().lower()
        
        if not filter_term:
            self.filtered_cameras = self.cameras.copy()
        else:
            self.filtered_cameras = []
            for camera in self.cameras:
                # Search in name, location, type, and source
                searchable_text = ' '.join([
                    str(camera.get('name', '')),
                    str(camera.get('location', '')),
                    str(camera.get('type', '')),
                    str(camera.get('source', ''))
                ]).lower()
                
                if filter_term in searchable_text:
                    self.filtered_cameras.append(camera)
        
        self.update_camera_list()
        
    def clear_filter(self):
        """Clear the filter"""
        self.filter_var.set('')
        self.filtered_cameras = self.cameras.copy()
        self.update_camera_list()
        
    def view_selected_camera(self):
        """Open selected camera URL in browser"""
        
        selection = self.camera_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a camera to view.")
            return
        
        item = self.camera_tree.item(selection[0])
        url = item['values'][1]  # URL is the second column
        
        if url and url != 'N/A':
            webbrowser.open(url)
        else:
            messagebox.showwarning("No URL", "This camera doesn't have a direct URL.")
    
    def copy_camera_url(self):
        """Copy selected camera URL to clipboard"""
        
        selection = self.camera_tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a camera to copy URL.")
            return
        
        item = self.camera_tree.item(selection[0])
        url = item['values'][1]  # URL is the second column
        
        if url and url != 'N/A':
            self.root.clipboard_clear()
            self.root.clipboard_append(url)
            self.status_var.set("URL copied to clipboard")
        else:
            messagebox.showwarning("No URL", "This camera doesn't have a direct URL.")
    
    def export_results(self):
        """Export results to JSON file"""
        
        if not self.cameras:
            messagebox.showwarning("No Results", "No cameras to export.")
            return
        
        filename = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            title="Export Camera Results"
        )
        
        if filename:
            try:
                report = {
                    'timestamp': datetime.now().isoformat(),
                    'total_cameras': len(self.cameras),
                    'cameras': self.cameras
                }
                
                with open(filename, 'w') as f:
                    json.dump(report, f, indent=2)
                
                messagebox.showinfo("Export Complete", f"Results exported to {filename}")
                
            except Exception as e:
                messagebox.showerror("Export Error", f"Error exporting results:\n{str(e)}")
    
    def clear_results(self):
        """Clear all results"""
        
        self.cameras = []
        self.filtered_cameras = []
        self.update_camera_list()
        self.status_var.set("Results cleared")
        self.progress_var.set(0)

def main():
    root = tk.Tk()
    app = CameraGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()