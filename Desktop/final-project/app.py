from flask import Flask, render_template, request
import requests

app = Flask(__name__)

# API Keys and Base URLs
FLIGHT_API_KEY = '1d0a66797e26e9706b01562e83b4b7d5'  # Replace with your AviationStack API Key
FLIGHT_BASE_URL = "https://api.aviationstack.com/v1/flights"
GEOAPIFY_API_KEY = 'cf1771daf74344ab9c1721071b6b6706'  # Replace with your Geoapify API Key

def get_destination_city(flight):
    """Extract the destination city from flight data."""
    try:
        arrival = flight.get("arrival", {})
        city = arrival.get("city")
        if city:
            return city
        return arrival.get("airport", None)
    except Exception as e:
        print(f"Error fetching destination city: {e}")
    return None

def get_places_for_city(city_name):
    """Fetch places of interest for a given city using Geoapify."""
    try:
        # Geocode the city to get coordinates
        geocode_url = f"https://api.geoapify.com/v1/geocode/search?text={city_name}&apiKey={GEOAPIFY_API_KEY}"
        geocode_response = requests.get(geocode_url)
        geocode_data = geocode_response.json()

        if geocode_response.status_code == 200 and geocode_data.get("features"):
            coordinates = geocode_data["features"][0]["geometry"]["coordinates"]
            lon, lat = coordinates

            # Fetch places near the coordinates
            places_url = (
                f"https://api.geoapify.com/v2/places?"
                f"categories=tourism.attraction,tourism.information,tourism.sights&"
                f"filter=circle:{lon},{lat},5000&limit=20&apiKey={GEOAPIFY_API_KEY}"
            )
            places_response = requests.get(places_url)
            places_data = places_response.json()

            if places_response.status_code == 200:
                places = places_data.get("features", [])
                for place in places:
                    # Extract latitude and longitude
                    place_lat = place["geometry"]["coordinates"][1]
                    place_lon = place["geometry"]["coordinates"][0]
                    # Generate a Google Maps directions link
                    place["properties"]["google_maps_url"] = (
                        f"https://www.google.com/maps/dir/?api=1&origin={city_name}&destination={place_lat},{place_lon}"
                    )
                return places
        else:
            print("City not found in Geoapify geocoding.")
    except Exception as e:
        print(f"Error fetching places: {e}")
    return []

@app.route("/", methods=["GET", "POST"])
def home():
    error_message = None  # Initialize error message
    if request.method == "POST":
        flight_number = request.form.get("flight_number")
        params = {"access_key": FLIGHT_API_KEY, "flight_iata": flight_number}
        response = requests.get(FLIGHT_BASE_URL, params=params)
        data = response.json()

        flight = data.get("data", [])[0] if data.get("data") else None
        if flight:
            destination_city = get_destination_city(flight)
            if destination_city:
                places = get_places_for_city(destination_city)
                return render_template(
                    "index.html", flight=flight, destination_city=destination_city, places=places, error_message=None
                )
        else:
            error_message = "Not a valid flight number."

    return render_template("index.html", flight=None, destination_city=None, places=None, error_message=error_message)


if __name__ == "__main__":
    app.run(debug=True)