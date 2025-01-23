import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, HelpingHand, Shield, X, RefreshCw } from 'lucide-react';

// Colorblind-friendly palette (Wong)
const STATUS_CONFIG = {
  needHelp: {
    color: '#D55E00',  // Vibrant orange
    icon: '!',
    title: 'Needs Help'
  },
  offerHelp: {
    color: '#009E73',  // Vibrant green
    icon: 'H',
    title: 'Offering Help'
  },
  safe: {
    color: '#0072B2',  // Strong blue
    icon: 'S',
    title: 'Safe Location'
  }
};

function App() {
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;
    setIsLoading(true);

    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
          existingScript.remove();
        }

        window.initializeMap = () => {
          resolve();
        };

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initializeMap`;
        script.async = true;
        script.defer = true;
        script.onerror = reject;
        
        document.head.appendChild(script);
      });
    };

    const initMap = () => {
      if (!mapRef.current) return;

      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 34.28998351243129, lng: -118.5383687459385 },
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(newMap);

      if (searchInputRef.current) {
        const searchBox = new window.google.maps.places.SearchBox(searchInputRef.current);
        
        searchBox.addListener('places_changed', async () => {
          setError('Searching for location...');
          const places = searchBox.getPlaces();

          if (!places || places.length === 0) {
            setError('No location found. Please try again.');
            return;
          }

          const place = places[0];
          if (!place.geometry || !place.geometry.location) {
            setError('Location details not found. Please try a different address.');
            return;
          }

          setError('');
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address
          };
          setSelectedLocation(location);

          newMap.panTo(place.geometry.location);
          newMap.setZoom(16);

          if (selectedAction) {
            createMarker(location, selectedAction, newMap);
          }
        });

        newMap.addListener('bounds_changed', () => {
          searchBox.setBounds(newMap.getBounds());
        });
      }

      setIsLoading(false);
    };

    const initializeApp = async () => {
      try {
        await loadGoogleMaps();
        initMap();
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setError('Error loading map. Please refresh the page.');
      }
    };

    initializeApp();

    return () => {
      delete window.initializeMap;
      scriptLoadedRef.current = false;
    };
  }, [selectedAction]);

  const createMarker = (location, type, mapInstance) => {
    try {
      const config = STATUS_CONFIG[type];

      const marker = new google.maps.Marker({
        position: location,
        map: mapInstance,
        title: config.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: config.color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 12
        },
        label: {
          text: config.icon,
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 'bold'
        }
      });

      const createInfoWindowContent = (markerData) => {
        const timestamp = new Date().toLocaleString();
        return `
          <div style="padding: 16px; font-size: 16px; max-width: 300px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 20px; font-weight: bold;">${markerData.title}</h3>
              <span style="background-color: ${STATUS_CONFIG[markerData.type].color}; 
                    color: white; 
                    padding: 4px 8px; 
                    border-radius: 4px;
                    font-size: 14px;">
                Current Status
              </span>
            </div>
            ${markerData.address ? 
              `<p style="margin: 0 0 8px 0; color: #666;">${markerData.address}</p>` : ''}
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
              Last updated: ${timestamp}
            </p>
            <div style="display: flex; gap: 8px;">
              <button id="updateMarker" style="
                flex: 1;
                background-color: #4CAF50;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                </svg>
                Change Status
              </button>
              <button id="removeMarker" style="
                background-color: #f44336;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        `;
      };

      const markerData = {
        id: Date.now().toString(),
        marker,
        type,
        location,
        title: config.title,
        address: location.address,
        timestamp: new Date().toLocaleString()
      };

      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(markerData)
      });

      marker.addListener('click', () => {
        if (selectedMarker) {
          selectedMarker.infoWindow.close();
        }
        infoWindow.open(mapInstance, marker);
        setSelectedMarker({ ...markerData, infoWindow });

        // Add event listeners after InfoWindow is opened
        google.maps.event.addListener(infoWindow, 'domready', () => {
          document.getElementById('updateMarker')?.addEventListener('click', () => {
            infoWindow.close();
            setSelectedMarker({ ...markerData, infoWindow });
            updateMarkerStatus(markerData.id);
          });

          document.getElementById('removeMarker')?.addEventListener('click', () => {
            infoWindow.close();
            removeMarker(markerData.id);
          });
        });
      });

      setMarkers(currentMarkers => [...currentMarkers, { ...markerData, infoWindow }]);

      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
      setSelectedLocation(null);
      setSelectedAction(null);
      setError('');
    } catch (error) {
      console.error('Error creating marker:', error);
      setError('Error placing marker. Please try again.');
    }
  };

  const updateMarkerStatus = (markerId) => {
    const markerToUpdate = markers.find(m => m.id === markerId);
    if (!markerToUpdate) {
      setError('Could not find marker to update');
      return;
    }

    const currentTypes = Object.keys(STATUS_CONFIG);
    const currentIndex = currentTypes.indexOf(markerToUpdate.type);
    const nextType = currentTypes[(currentIndex + 1) % currentTypes.length];
    const config = STATUS_CONFIG[nextType];

    // Update marker icon and label
    markerToUpdate.marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: config.color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 12
    });
    markerToUpdate.marker.setLabel({
      text: config.icon,
      color: '#FFFFFF',
      fontSize: '14px',
      fontWeight: 'bold'
    });

    // Update marker data
    const updatedMarkerData = {
      ...markerToUpdate,
      type: nextType,
      title: config.title,
      timestamp: new Date().toLocaleString()
    };

    // Update markers array
    setMarkers(currentMarkers =>
      currentMarkers.map(m =>
        m.id === markerId ? updatedMarkerData : m
      )
    );

    // Show confirmation message
    setError(`Status updated to ${config.title}`);
    setTimeout(() => setError(''), 3000);
  };

  const removeMarker = (markerId) => {
    const markerToRemove = markers.find(m => m.id === markerId);
    if (markerToRemove) {
      markerToRemove.marker.setMap(null);
      setMarkers(currentMarkers => currentMarkers.filter(m => m.id !== markerId));
      setError('Marker removed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleButtonClick = (type) => {
    setSelectedAction(type);
    if (!map) {
      setError('Map is not ready yet. Please wait a moment.');
      return;
    }

    if (selectedLocation) {
      createMarker(selectedLocation, type, map);
    } else {
      setError('Please enter your address first');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4" role="heading" aria-level="1">
          Emergency Response Map
        </h1>
        {selectedAction ? (
          <p className="text-xl text-gray-700">
            Please enter your address to mark your location
          </p>
        ) : (
          <p className="text-xl text-gray-700">
            Select your status, then enter your address
          </p>
        )}
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={() => handleButtonClick('needHelp')}
          disabled={isLoading}
          aria-label="Request help at your location"
          style={{ backgroundColor: STATUS_CONFIG.needHelp.color }}
          className={`flex items-center justify-center gap-3 p-6 hover:opacity-90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-orange-300 ${
            selectedAction === 'needHelp' ? 'ring-4 ring-orange-300' : ''
          }`}>
          <AlertCircle size={32} aria-hidden="true" />
          <span className="text-2xl font-semibold">Need Help</span>
        </button>

        <button 
          onClick={() => handleButtonClick('offerHelp')}
          disabled={isLoading}
          aria-label="Offer help at your location"
          style={{ backgroundColor: STATUS_CONFIG.offerHelp.color }}
          className={`flex items-center justify-center gap-3 p-6 hover:opacity-90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-green-300 ${
            selectedAction === 'offerHelp' ? 'ring-4 ring-green-300' : ''
          }`}>
          <HelpingHand size={32} aria-hidden="true" />
          <span className="text-2xl font-semibold">Offer Help</span>
        </button>

        <button 
          onClick={() => handleButtonClick('safe')}
          disabled={isLoading}
          aria-label="Mark yourself as safe at your location"
          style={{ backgroundColor: STATUS_CONFIG.safe.color }}
          className={`flex items-center justify-center gap-3 p-6 hover:opacity-90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-blue-300 ${
            selectedAction === 'safe' ? 'ring-4 ring-blue-300' : ''
          }`}>
          <Shield size={32} aria-hidden="true" />
          <span className="text-2xl font-semibold">I'm Safe</span>
        </button>
      </div>

      <div className="mb-6">
        <label htmlFor="address-search" className="block text-lg mb-2">
          Your Location
        </label>
        <input
          id="address-search"
          ref={searchInputRef}
          type="text"
          placeholder="Enter your address"
          aria-label="Search for your address"
          className="w-full p-4 text-xl rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <div 
          ref={mapRef}
          className="h-96 rounded-lg"
          role="application"
          aria-label="Map showing emergency status markers"
        />
      </div>
    </div>
  );
}

export default App;