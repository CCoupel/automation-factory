#!/usr/bin/env python3

import requests
import json

def test_version_api():
    """Test the enriched version API"""
    print("=== Testing Version API ===")
    
    try:
        # Test backend API directly
        response = requests.get("http://localhost:8000/api/version", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response successful")
            print(f"Version: {data.get('version', 'N/A')}")
            print(f"Base Version: {data.get('base_version', 'N/A')}")
            print(f"Internal Version: {data.get('internal_version', 'N/A')}")
            print(f"Name: {data.get('name', 'N/A')}")
            print(f"Environment: {data.get('environment', 'N/A')}")
            print(f"Build: {data.get('build', 'N/A')}")
            print(f"Is RC (deprecated, alias is_build_candidate): {data.get('is_rc', 'N/A')}")
            print(f"Is Build Candidate: {data.get('is_build_candidate', 'N/A')}")
            
            features = data.get('features', {})
            if features:
                print(f"Feature Title: {features.get('title', 'N/A')}")
                print(f"Release Date: {features.get('release_date', 'N/A')}")
                print(f"Features Count: {len(features.get('features', []))}")
                print(f"Improvements Count: {len(features.get('improvements', []))}")
                
                print("\n📋 Features:")
                for feature in features.get('features', []):
                    print(f"  • {feature}")
                    
                print("\n⚡ Improvements:")  
                for improvement in features.get('improvements', []):
                    print(f"  • {improvement}")
                    
            else:
                print("❌ No features data found")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Backend not running?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_version_api()