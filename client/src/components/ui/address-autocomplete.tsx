import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, ImageOff, Mountain, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  placeholder?: string;
  className?: string;
  showStreetView?: boolean;
  "data-testid"?: string;
}

interface SoilData {
  soilType: string;
  region: string | null;
  nearestTown: string | null;
  naturalVegetation: string | null;
  state: string | null;
  ascOrder: string | null;
  comments: string | null;
  installationNotes: string | null;
  source: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

declare global {
  interface Window {
    google?: typeof google;
    initGoogleMapsCallback?: () => void;
  }
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already loaded (handles hot reload)
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not configured. Address autocomplete will be disabled.");
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Poll until loaded
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      return;
    }

    // Create and load the script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Poll until places is available
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 50);
    };
    document.head.appendChild(script);
  });
}

function StreetViewPreview({ address }: { address: string }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [address]);

  if (!apiKey || !address || address.length < 10) {
    return null;
  }

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x120&location=${encodeURIComponent(address)}&key=${apiKey}`;
  // Open satellite view which always has imagery, with option to switch to Street View if available
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&basemap=satellite`;

  return (
    <div className="mt-2 rounded-md overflow-hidden border bg-muted/30">
      {isLoading && !hasError && (
        <div className="h-[100px] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground">
          <ImageOff className="h-6 w-6 mb-1" />
          <span className="text-xs">Street View not available</span>
        </div>
      ) : (
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block cursor-pointer"
          title="Click to open in Google Maps"
        >
          <img
            src={streetViewUrl}
            alt="Street View of address"
            className={`w-full h-[100px] object-cover hover:opacity-90 transition-opacity ${isLoading ? 'hidden' : 'block'}`}
            onLoad={(e) => {
              setIsLoading(false);
              const img = e.target as HTMLImageElement;
              if (img.naturalWidth === 600 && img.naturalHeight === 300) {
                setHasError(true);
              }
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            data-testid="streetview-image"
          />
        </a>
      )}
      <div className="px-2 py-1 text-[10px] text-muted-foreground text-right border-t flex items-center justify-between">
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View in Google Maps
        </a>
        <span>Site Preview</span>
      </div>
    </div>
  );
}

function SoilDataDisplay({ lat, lng }: { lat: number; lng: number }) {
  const { data: soilData, isLoading, error } = useQuery<SoilData>({
    queryKey: ["/api/soil-data", lat, lng],
    queryFn: async () => {
      const response = await fetch(`/api/soil-data?lat=${lat}&lng=${lng}`);
      if (!response.ok) throw new Error("Failed to fetch soil data");
      return response.json();
    },
    enabled: !isNaN(lat) && !isNaN(lng),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mt-2 rounded-md border bg-muted/30 p-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading soil data...</span>
      </div>
    );
  }

  if (error || !soilData) {
    return (
      <div className="mt-2 rounded-md border bg-muted/30 p-2" data-testid="soil-data-display">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span data-testid="soil-type">Soil data unavailable for this location</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1" data-testid="installation-notes">
          Site assessment recommended - contact office for soil evaluation
        </p>
      </div>
    );
  }

  // Determine the icon and color based on installation difficulty
  const getInstallIcon = () => {
    if (!soilData.installationNotes) return null;
    const notes = soilData.installationNotes.toLowerCase();
    if (notes.includes("easy") || notes.includes("standard")) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (notes.includes("harder") || notes.includes("core drill")) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <Mountain className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="mt-2 rounded-md border bg-muted/30" data-testid="soil-data-display">
      <div className="px-3 py-2 border-b bg-muted/50 flex items-center gap-2">
        <Mountain className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Soil Information</span>
      </div>
      <div className="p-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Soil Type:</span>
          <span className="font-medium" data-testid="soil-type">{soilData.soilType}</span>
        </div>
        {soilData.region && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Region:</span>
            <span className="text-right">{soilData.region}</span>
          </div>
        )}
        {soilData.installationNotes && (
          <div className="mt-2 pt-2 border-t flex items-start gap-2">
            {getInstallIcon()}
            <span className="text-xs" data-testid="installation-notes">{soilData.installationNotes}</span>
          </div>
        )}
      </div>
      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t text-right">
        Source: {soilData.source}
      </div>
    </div>
  );
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = "Enter address...",
  className,
  showStreetView = false,
  "data-testid": dataTestId,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState(value);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
    if (value && value.length >= 10) {
      setConfirmedAddress(value);
      // If we have an address but no coordinates, geocode it
      if (!coordinates && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: value }, (
          results: google.maps.GeocoderResult[] | null, 
          status: google.maps.GeocoderStatus
        ) => {
          if (status === window.google!.maps.GeocoderStatus.OK && results?.[0]?.geometry?.location) {
            const newCoords = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            };
            setCoordinates(newCoords);
            onCoordinatesChange?.(newCoords);
          }
        });
      }
    }
  }, [value]);

  useEffect(() => {
    const initServices = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement("div");
        placesService.current = new google.maps.places.PlacesService(dummyDiv);
        setIsApiAvailable(true);
      }
    };

    loadGoogleMapsScript().then(initServices);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "au" },
        types: ["address"],
      },
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setHighlightedIndex(-1);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (isApiAvailable && newValue.length >= 3) {
      debounceTimer.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          handleSelectPrediction(predictions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    if (!placesService.current) {
      setInputValue(prediction.description);
      onChange(prediction.description);
      setConfirmedAddress(prediction.description);
      setShowDropdown(false);
      setPredictions([]);
      return;
    }

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.formatted_address) {
          setInputValue(place.formatted_address);
          onChange(place.formatted_address);
          setConfirmedAddress(place.formatted_address);
          
          // Extract coordinates for soil data lookup
          if (place.geometry?.location) {
            const newCoords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            setCoordinates(newCoords);
            onCoordinatesChange?.(newCoords);
          }
        } else {
          setInputValue(prediction.description);
          onChange(prediction.description);
          setConfirmedAddress(prediction.description);
        }
        setShowDropdown(false);
        setPredictions([]);
        setHighlightedIndex(-1);
      }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className={className}
          data-testid={dataTestId}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {predictions.map((prediction, index) => (
              <li
                key={prediction.place_id}
                onClick={() => handleSelectPrediction(prediction)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent ${
                  highlightedIndex === index ? "bg-accent" : ""
                }`}
                data-testid={`address-suggestion-${prediction.place_id}`}
              >
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground text-right">
            Powered by Google
          </div>
        </div>
      )}

      {showStreetView && confirmedAddress && (
        <>
          <StreetViewPreview address={confirmedAddress} />
          {coordinates && (
            <SoilDataDisplay lat={coordinates.lat} lng={coordinates.lng} />
          )}
        </>
      )}
    </div>
  );
}
