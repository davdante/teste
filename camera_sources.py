#!/usr/bin/env python3
"""
Camera Sources Module
=====================

This module contains various sources and methods for finding publicly available cameras
for legitimate OSINT purposes.
"""

import requests
import re
import json
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

class CameraSources:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        })
    
    def get_earthcam_feeds(self):
        """
        Get camera feeds from EarthCam (legitimate public cameras)
        """
        cameras = []
        earthcam_locations = [
            'https://www.earthcam.com/usa/newyork/timessquare/',
            'https://www.earthcam.com/usa/florida/miami/',
            'https://www.earthcam.com/world/england/london/',
            'https://www.earthcam.com/world/france/paris/',
            'https://www.earthcam.com/world/japan/tokyo/',
        ]
        
        for location in earthcam_locations:
            try:
                response = self.session.get(location, timeout=10)
                if response.status_code == 200:
                    # Parse the page to find camera streams
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Look for video elements or stream URLs
                    video_elements = soup.find_all(['video', 'img', 'iframe'])
                    
                    for element in video_elements:
                        src = element.get('src') or element.get('data-src')
                        if src and any(ext in src.lower() for ext in ['.mjpg', '.jpg', '.jpeg', 'video']):
                            camera_info = {
                                'name': f"EarthCam - {location.split('/')[-2].title()}",
                                'url': src if src.startswith('http') else f"https://www.earthcam.com{src}",
                                'location': location.split('/')[-2].replace('-', ' ').title(),
                                'type': 'public_tourism',
                                'source': 'earthcam'
                            }
                            cameras.append(camera_info)
                            
            except Exception as e:
                logger.warning(f"Error accessing EarthCam location {location}: {e}")
        
        return cameras
    
    def get_traffic_cameras(self):
        """
        Get traffic camera feeds from various DOT sources
        """
        cameras = []
        
        # Example traffic camera sources (these are public DOT cameras)
        traffic_sources = {
            'NYC DOT': 'https://webcams.nyctmc.org/',
            'CalTrans': 'https://cwwp2.dot.ca.gov/vm/iframemap.htm',
            'WSDOT': 'https://www.wsdot.wa.gov/traffic/cameras/',
        }
        
        for source_name, url in traffic_sources.items():
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    camera_info = {
                        'name': f"{source_name} Traffic Cameras",
                        'url': url,
                        'type': 'traffic',
                        'source': source_name.lower().replace(' ', '_')
                    }
                    cameras.append(camera_info)
                    
            except Exception as e:
                logger.warning(f"Error accessing {source_name}: {e}")
        
        return cameras
    
    def get_weather_cameras(self):
        """
        Get weather monitoring cameras
        """
        cameras = []
        
        weather_sources = [
            {
                'name': 'WeatherBug Cameras',
                'url': 'https://www.weatherbug.com/weather-cameras/',
                'type': 'weather'
            },
            {
                'name': 'NOAA Weather Cameras',
                'url': 'https://www.weather.gov/camera/',
                'type': 'weather'
            }
        ]
        
        for source in weather_sources:
            try:
                response = self.session.get(source['url'], timeout=10)
                if response.status_code == 200:
                    cameras.append(source)
                    
            except Exception as e:
                logger.warning(f"Error accessing {source['name']}: {e}")
        
        return cameras
    
    def get_airport_cameras(self):
        """
        Get airport webcams (publicly available)
        """
        cameras = []
        
        airport_cameras = [
            {
                'name': 'LAX Airport Webcam',
                'url': 'https://www.flylax.com/lax-webcam',
                'location': 'Los Angeles, CA',
                'type': 'airport'
            },
            {
                'name': 'JFK Airport Views',
                'url': 'https://www.panynj.gov/airports/jfk-webcam.html',
                'location': 'New York, NY',
                'type': 'airport'
            }
        ]
        
        for camera in airport_cameras:
            try:
                response = self.session.get(camera['url'], timeout=10)
                if response.status_code == 200:
                    cameras.append(camera)
                    
            except Exception as e:
                logger.warning(f"Error accessing {camera['name']}: {e}")
        
        return cameras
    
    def get_beach_cameras(self):
        """
        Get beach and surf cameras
        """
        cameras = []
        
        beach_cameras = [
            {
                'name': 'Surfline Cameras',
                'url': 'https://www.surfline.com/surf-report/',
                'type': 'beach_surf'
            },
            {
                'name': 'BeachCams.com',
                'url': 'https://www.beachcams.com/',
                'type': 'beach'
            }
        ]
        
        for camera in beach_cameras:
            try:
                response = self.session.get(camera['url'], timeout=10)
                if response.status_code == 200:
                    cameras.append(camera)
                    
            except Exception as e:
                logger.warning(f"Error accessing {camera['name']}: {e}")
        
        return cameras
    
    def get_all_public_sources(self):
        """
        Get cameras from all public sources
        """
        all_cameras = []
        
        logger.info("Gathering EarthCam feeds...")
        all_cameras.extend(self.get_earthcam_feeds())
        
        logger.info("Gathering traffic cameras...")
        all_cameras.extend(self.get_traffic_cameras())
        
        logger.info("Gathering weather cameras...")
        all_cameras.extend(self.get_weather_cameras())
        
        logger.info("Gathering airport cameras...")
        all_cameras.extend(self.get_airport_cameras())
        
        logger.info("Gathering beach cameras...")
        all_cameras.extend(self.get_beach_cameras())
        
        return all_cameras

class CameraValidator:
    """
    Validates camera URLs and checks accessibility
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        })
    
    def validate_camera_url(self, url, timeout=10):
        """
        Validate if a URL is a working camera feed
        """
        try:
            response = self.session.head(url, timeout=timeout)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                
                # Check for valid camera content types
                valid_types = [
                    'image/jpeg',
                    'image/jpg', 
                    'multipart/x-mixed-replace',
                    'video/mp4',
                    'application/octet-stream'
                ]
                
                if any(vtype in content_type for vtype in valid_types):
                    return True
                    
        except Exception as e:
            logger.debug(f"Error validating {url}: {e}")
            
        return False
    
    def batch_validate(self, camera_urls, max_workers=10):
        """
        Validate multiple camera URLs concurrently
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        valid_cameras = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_url = {
                executor.submit(self.validate_camera_url, url): url 
                for url in camera_urls
            }
            
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    is_valid = future.result()
                    if is_valid:
                        valid_cameras.append(url)
                        logger.info(f"Valid camera found: {url}")
                        
                except Exception as e:
                    logger.warning(f"Error validating {url}: {e}")
        
        return valid_cameras