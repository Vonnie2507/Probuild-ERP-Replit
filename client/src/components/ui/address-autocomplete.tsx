import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, ImageOff } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showStreetView?: boolean;
  "data-testid"?: string;
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

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (googleMapsLoading) {
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not configured. Address autocomplete will be disabled.");
      return;
    }

    googleMapsLoading = true;

    window.initGoogleMapsCallback = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
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

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${encodeURIComponent(address)}&key=${apiKey}`;

  return (
    <div className="mt-2 rounded-md overflow-hidden border bg-muted/30">
      {isLoading && !hasError && (
        <div className="h-[150px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground">
          <ImageOff className="h-8 w-8 mb-2" />
          <span className="text-sm">Street View not available</span>
        </div>
      ) : (
        <img
          src={streetViewUrl}
          alt="Street View of address"
          className={`w-full h-[150px] object-cover ${isLoading ? 'hidden' : 'block'}`}
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
      )}
      <div className="px-2 py-1 text-[10px] text-muted-foreground text-right border-t">
        Google Street View
      </div>
    </div>
  );
}

export function AddressAutocomplete({
  value,
  onChange,
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
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
    if (value && value.length >= 10) {
      setConfirmedAddress(value);
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
        fields: ["formatted_address"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.formatted_address) {
          setInputValue(place.formatted_address);
          onChange(place.formatted_address);
          setConfirmedAddress(place.formatted_address);
        } else {
          setInputValue(prediction.description);
          onChange(prediction.description);
          setConfirmedAddress(prediction.description);
        }
        setShowDropdown(false);
        setPredictions([]);
      }
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
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
            {predictions.map((prediction) => (
              <li
                key={prediction.place_id}
                onClick={() => handleSelectPrediction(prediction)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
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
        <StreetViewPreview address={confirmedAddress} />
      )}
    </div>
  );
}
