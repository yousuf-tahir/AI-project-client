"""
Diagnostic script to test if CORS and endpoints are working
Run this AFTER starting your server
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, method="GET", data=None):
    """Test a single endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"Method: {method}")
    print('='*60)
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        
        print(f"✅ Status Code: {response.status_code}")
        print(f"✅ Headers: {dict(response.headers)}")
        
        # Check CORS headers
        if 'access-control-allow-origin' in response.headers:
            print(f"✅ CORS Header Found: {response.headers['access-control-allow-origin']}")
        else:
            print("❌ CORS Header NOT Found!")
        
        try:
            data = response.json()
            print(f"✅ Response Data: {json.dumps(data, indent=2)}")
        except:
            print(f"Response Text: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to server!")
        print("   Make sure server is running on port 8000")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

def main():
    print("\n" + "="*60)
    print("🔍 CORS AND ENDPOINT DIAGNOSTIC TEST")
    print("="*60)
    print("\nMake sure your server is running first!")
    print("Run: python main.py")
    print("\n" + "="*60)
    
    # Test 1: Root endpoint
    test_endpoint("Root Endpoint", f"{BASE_URL}/")
    
    # Test 2: Health check
    test_endpoint("Health Check", f"{BASE_URL}/health")
    
    # Test 3: CORS test endpoint
    test_endpoint("CORS Test", f"{BASE_URL}/test-cors")
    
    # Test 4: Candidates list
    test_endpoint("Candidates List", f"{BASE_URL}/api/interviews/candidates/list")
    
    # Test 5: OPTIONS request (CORS preflight)
    print(f"\n{'='*60}")
    print("Testing: CORS Preflight (OPTIONS)")
    print(f"URL: {BASE_URL}/api/interviews/candidates/list")
    print('='*60)
    
    try:
        response = requests.options(
            f"{BASE_URL}/api/interviews/candidates/list",
            headers={
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'content-type'
            },
            timeout=5
        )
        print(f"✅ Status Code: {response.status_code}")
        print(f"✅ Headers: {dict(response.headers)}")
        
        # Check specific CORS headers
        cors_headers = [
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers'
        ]
        
        for header in cors_headers:
            if header in response.headers:
                print(f"✅ {header}: {response.headers[header]}")
            else:
                print(f"❌ {header}: NOT FOUND")
                
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print("\n" + "="*60)
    print("🏁 DIAGNOSTIC COMPLETE")
    print("="*60)
    
    print("\n📋 SUMMARY:")
    print("- If all tests show CORS headers, CORS is working")
    print("- If connection errors, server is not running")
    print("- If 404 errors, routes are not registered")
    print("- If 500 errors, check server logs for exceptions")

if __name__ == "__main__":
    main()