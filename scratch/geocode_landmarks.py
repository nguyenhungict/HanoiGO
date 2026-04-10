import csv
import time
from geopy.geocoders import Nominatim

input_file = r'e:/USTH_ICT/Thesis/dataset/popular_hanoi_landmarks.csv'
output_file = r'e:/USTH_ICT/Thesis/dataset/popular_hanoi_landmarks_geo.csv'

# Initialize Nominatim API
# User agent is required by OpenStreetMap's usage policy
geolocator = Nominatim(user_agent="hanoigo_thesis_project_agent")

def get_coordinates(name):
    # Try with Hanoi, Vietnam first
    query = f"{name}, Hanoi, Vietnam"
    try:
        location = geolocator.geocode(query, timeout=10)
        if location:
            return location.latitude, location.longitude
        
        # fallback query if strict one fails
        location = geolocator.geocode(f"{name}, Vietnam", timeout=10)
        if location:
            return location.latitude, location.longitude
            
        # fallback query without Vietnam
        location = geolocator.geocode(name, timeout=10)
        if location:
            return location.latitude, location.longitude
    except Exception as e:
        pass
    return None, None

def main():
    landmarks = []
    with open(input_file, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            landmarks.append(row)

    # Append coordinate headers
    fieldnames = list(landmarks[0].keys()) + ['Latitude', 'Longitude']

    found = 0
    not_found = 0

    with open(output_file, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for i, row in enumerate(landmarks):
            name = row['Tên địa danh']
            print(f"[{i+1}/{len(landmarks)}] Fetching coordinates... ", end="")
            
            lat, lng = get_coordinates(name)
            row['Latitude'] = lat if lat else ''
            row['Longitude'] = lng if lng else ''
            
            if lat and lng:
                print(f"Found ({lat}, {lng})")
                found += 1
            else:
                print("Not found")
                not_found += 1
                
            writer.writerow(row)
            # Sleep to respect Nominatim's Usage Policy (~1 req/sec)
            time.sleep(1.2) 

    print(f"\nGeocoding finished! Found coordinates for {found} locations. Failed {not_found}.")
    print(f"Results saved to: {output_file}")

if __name__ == "__main__":
    main()
