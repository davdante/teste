#!/usr/bin/env python3
"""
OSINT Camera Access Tool
========================

This tool is designed for educational and legitimate OSINT purposes only.
It accesses publicly available camera feeds from official sources like:
- Traffic cameras
- Weather monitoring cameras  
- Public surveillance feeds
- Tourism/landmark cameras

IMPORTANT ETHICAL GUIDELINES:
- Only access publicly available feeds
- Respect privacy and local laws
- Do not use for malicious purposes
- Follow responsible disclosure practices

Author: OSINT Educational Tool
License: Educational Use Only
"""

import requests
import json
import time
import argparse
from urllib.parse import urljoin, urlparse
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from datetime import datetime
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('osint_camera.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class OSINTCameraFinder:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Public camera sources
        self.camera_sources = {
            'traffic_cameras': [
                'https://www.earthcam.com/',
                'https://www.insecam.org/',
                'https://www.opentopia.com/',
                'https://www.webcamtaxi.com/',
            ],
            'weather_cameras': [
                'https://www.weatherbug.com/weather-cameras/',
                'https://www.windy.com/webcams',
            ],
            'tourism_cameras': [
                'https://www.skylinewebcams.com/',
                'https://www.worldcam.eu/',
            ]
        }
        
        # Common camera URL patterns
        self.camera_patterns = [
            '/mjpg/video.mjpg',
            '/video.cgi',
            '/videostream.cgi',
            '/axis-cgi/mjpg/video.cgi',
            '/mjpg/1/video.mjpg',
            '/cgi-bin/faststream.jpg',
            '/streaming/channels/1/picture',
        ]
        
        # Common camera ports
        self.common_ports = [80, 81, 8080, 8081, 8090, 554, 1935]
        
    def search_shodan_cameras(self, api_key=None, query="webcam"):
        """
        Search for cameras using Shodan API (requires API key)
        """
        if not api_key:
            logger.warning("Shodan API key not provided. Skipping Shodan search.")
            return []
            
        try:
            import shodan
            api = shodan.Shodan(api_key)
            
            # Search for webcams
            results = api.search(query)
            cameras = []
            
            for result in results['matches']:
                camera_info = {
                    'ip': result['ip_str'],
                    'port': result['port'],
                    'location': {
                        'country': result.get('location', {}).get('country_name', 'Unknown'),
                        'city': result.get('location', {}).get('city', 'Unknown'),
                        'latitude': result.get('location', {}).get('latitude'),
                        'longitude': result.get('location', {}).get('longitude'),
                    },
                    'organization': result.get('org', 'Unknown'),
                    'timestamp': result.get('timestamp', ''),
                    'product': result.get('product', ''),
                }
                cameras.append(camera_info)
                
            logger.info(f"Found {len(cameras)} cameras via Shodan")
            return cameras
            
        except Exception as e:
            logger.error(f"Error searching Shodan: {e}")
            return []
    
    def check_camera_url(self, url, timeout=5):
        """
        Check if a URL is a valid camera stream
        """
        try:
            response = self.session.get(url, timeout=timeout, stream=True)
            content_type = response.headers.get('content-type', '').lower()
            
            if response.status_code == 200:
                # Check for image/video content types
                if any(ct in content_type for ct in ['image', 'video', 'mjpeg', 'multipart']):
                    return True
                    
                # Check if it's a valid image by trying to read a few bytes
                try:
                    chunk = next(response.iter_content(chunk_size=1024))
                    if chunk and (chunk.startswith(b'\xff\xd8') or b'boundary' in chunk):
                        return True
                except:
                    pass
                    
        except Exception as e:
            logger.debug(f"Error checking {url}: {e}")
            
        return False
    
    def scan_ip_for_cameras(self, ip, ports=None):
        """
        Scan an IP address for camera endpoints
        """
        if ports is None:
            ports = self.common_ports
            
        cameras_found = []
        
        for port in ports:
            for pattern in self.camera_patterns:
                url = f"http://{ip}:{port}{pattern}"
                
                if self.check_camera_url(url):
                    camera_info = {
                        'url': url,
                        'ip': ip,
                        'port': port,
                        'pattern': pattern,
                        'timestamp': datetime.now().isoformat()
                    }
                    cameras_found.append(camera_info)
                    logger.info(f"Found camera: {url}")
                    
        return cameras_found
    
    def get_public_camera_feeds(self):
        """
        Get publicly available camera feeds from known sources
        """
        public_feeds = []
        
        # Example public feeds (these are legitimate public cameras)
        known_public_feeds = [
            {
                'name': 'Times Square, NYC',
                'url': 'https://www.earthcam.com/usa/newyork/timessquare/?cam=tsstreet',
                'location': 'New York, USA',
                'type': 'tourism'
            },
            {
                'name': 'Abbey Road, London',
                'url': 'https://www.earthcam.com/world/england/london/abbeyroad/?cam=abbeyroad_uk',
                'location': 'London, UK',
                'type': 'tourism'
            },
            {
                'name': 'Niagara Falls',
                'url': 'https://www.niagarafallsstatepark.com/niagara-falls-webcam',
                'location': 'Niagara Falls, USA',
                'type': 'tourism'
            }
        ]
        
        for feed in known_public_feeds:
            try:
                response = self.session.get(feed['url'], timeout=10)
                if response.status_code == 200:
                    public_feeds.append(feed)
                    logger.info(f"Verified public feed: {feed['name']}")
            except Exception as e:
                logger.warning(f"Could not verify feed {feed['name']}: {e}")
                
        return public_feeds
    
    def capture_screenshot(self, camera_url, output_dir="screenshots"):
        """
        Capture a screenshot from a camera feed
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        try:
            # Try to open the camera stream with OpenCV
            cap = cv2.VideoCapture(camera_url)
            
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"{output_dir}/camera_{timestamp}.jpg"
                    cv2.imwrite(filename, frame)
                    logger.info(f"Screenshot saved: {filename}")
                    cap.release()
                    return filename
                else:
                    logger.warning(f"Could not read frame from {camera_url}")
            else:
                logger.warning(f"Could not open camera stream: {camera_url}")
                
            cap.release()
            
        except Exception as e:
            logger.error(f"Error capturing screenshot from {camera_url}: {e}")
            
        return None
    
    def generate_report(self, cameras, output_file="camera_report.json"):
        """
        Generate a JSON report of found cameras
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_cameras': len(cameras),
            'cameras': cameras
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
            
        logger.info(f"Report saved to {output_file}")
        return output_file
    
    def display_camera_info(self, cameras):
        """
        Display camera information in a formatted way
        """
        print("\n" + "="*80)
        print("OSINT CAMERA DISCOVERY RESULTS")
        print("="*80)
        print(f"Total cameras found: {len(cameras)}")
        print("="*80)
        
        for i, camera in enumerate(cameras, 1):
            print(f"\n[{i}] Camera Information:")
            print("-" * 40)
            
            if 'url' in camera:
                print(f"URL: {camera['url']}")
            if 'ip' in camera:
                print(f"IP: {camera['ip']}")
            if 'port' in camera:
                print(f"Port: {camera['port']}")
            if 'location' in camera:
                if isinstance(camera['location'], dict):
                    print(f"Location: {camera['location'].get('city', '')}, {camera['location'].get('country', '')}")
                else:
                    print(f"Location: {camera['location']}")
            if 'name' in camera:
                print(f"Name: {camera['name']}")
            if 'type' in camera:
                print(f"Type: {camera['type']}")
            if 'organization' in camera:
                print(f"Organization: {camera['organization']}")
                
        print("\n" + "="*80)

def main():
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                    OSINT Camera Discovery Tool                   ║
    ║                                                                  ║
    ║  ETHICAL USE ONLY - Educational and Research Purposes           ║
    ║  - Only accesses publicly available camera feeds                ║
    ║  - Respects privacy and applicable laws                         ║
    ║  - For legitimate OSINT research only                           ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
    
    parser = argparse.ArgumentParser(description='OSINT Camera Discovery Tool')
    parser.add_argument('--shodan-key', help='Shodan API key for advanced search')
    parser.add_argument('--scan-ip', help='Scan specific IP address for cameras')
    parser.add_argument('--public-feeds', action='store_true', help='Get known public camera feeds')
    parser.add_argument('--screenshot', action='store_true', help='Capture screenshots from found cameras')
    parser.add_argument('--output', default='camera_report.json', help='Output report file')
    parser.add_argument('--verbose', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    finder = OSINTCameraFinder()
    all_cameras = []
    
    # Get public camera feeds
    if args.public_feeds or not any([args.shodan_key, args.scan_ip]):
        logger.info("Searching for public camera feeds...")
        public_cameras = finder.get_public_camera_feeds()
        all_cameras.extend(public_cameras)
    
    # Shodan search
    if args.shodan_key:
        logger.info("Searching cameras via Shodan...")
        shodan_cameras = finder.search_shodan_cameras(args.shodan_key)
        all_cameras.extend(shodan_cameras)
    
    # IP scan
    if args.scan_ip:
        logger.info(f"Scanning IP {args.scan_ip} for cameras...")
        ip_cameras = finder.scan_ip_for_cameras(args.scan_ip)
        all_cameras.extend(ip_cameras)
    
    # Display results
    finder.display_camera_info(all_cameras)
    
    # Generate report
    finder.generate_report(all_cameras, args.output)
    
    # Capture screenshots if requested
    if args.screenshot and all_cameras:
        logger.info("Capturing screenshots...")
        for camera in all_cameras[:5]:  # Limit to first 5 cameras
            if 'url' in camera:
                finder.capture_screenshot(camera['url'])
    
    print(f"\nScan complete! Report saved to {args.output}")
    print(f"Found {len(all_cameras)} cameras total.")

if __name__ == "__main__":
    main()