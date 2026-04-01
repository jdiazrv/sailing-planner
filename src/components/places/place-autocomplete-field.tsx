"use client";

import { useEffect, useRef, useState } from "react";

import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";

type PlaceAutocompleteFieldProps = {
  defaultLabel?: string | null;
  defaultExternalPlaceId?: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  labelName: string;
  sourceName: string;
  externalIdName: string;
  latitudeName: string;
  longitudeName: string;
  placeholder?: string;
  disabled?: boolean;
};

type Suggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  placePrediction: google.maps.places.PlacePrediction;
};

const isPlacePrediction = (
  prediction: google.maps.places.PlacePrediction | null,
): prediction is google.maps.places.PlacePrediction => Boolean(prediction);

const trimPlaceLabel = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 1)
    .join(", ");

export const PlaceAutocompleteField = ({
  defaultLabel,
  defaultExternalPlaceId,
  defaultLatitude,
  defaultLongitude,
  labelName,
  sourceName,
  externalIdName,
  latitudeName,
  longitudeName,
  placeholder,
  disabled = false,
}: PlaceAutocompleteFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const requestIdRef = useRef(0);
  const [inputValue, setInputValue] = useState(defaultLabel ?? "");
  const [source, setSource] = useState(
    defaultExternalPlaceId ? "google_places" : "manual",
  );
  const [externalId, setExternalId] = useState(defaultExternalPlaceId ?? "");
  const [latitude, setLatitude] = useState(
    defaultLatitude == null ? "" : String(defaultLatitude),
  );
  const [longitude, setLongitude] = useState(
    defaultLongitude == null ? "" : String(defaultLongitude),
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!hasGoogleMapsKey || disabled || !hasUserInteracted || !isFocused) {
      return;
    }

    const trimmed = inputValue.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    void (async () => {
      const maps = await loadGoogleMaps();
      if (!maps || cancelled) {
        return;
      }

      const { AutocompleteSessionToken, AutocompleteSuggestion } =
        (await maps.maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;

      sessionRef.current ??= new AutocompleteSessionToken();

      const response =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionRef.current,
        });

      if (cancelled || currentRequestId !== requestIdRef.current) {
        return;
      }

      const nextSuggestions = response.suggestions
        .map((item) => item.placePrediction)
        .filter(isPlacePrediction)
        .map((prediction) => ({
          id: prediction.placeId,
          primaryText: trimPlaceLabel(
            prediction.text?.toString() ?? prediction.placeId,
          ),
          secondaryText: trimPlaceLabel(
            prediction.secondaryText?.toString() ??
              prediction.text?.toString() ??
              "",
          ),
          placePrediction: prediction,
        }));

      setSuggestions(nextSuggestions);
      setIsOpen(nextSuggestions.length > 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [disabled, hasUserInteracted, inputValue, isFocused]);

  const markManual = (nextValue: string) => {
    setInputValue(nextValue);
    setSource("manual");
    setExternalId("");
    setLatitude("");
    setLongitude("");
  };

  const handleSelect = async (suggestion: Suggestion) => {
    const maps = await loadGoogleMaps();
    if (!maps) {
      return;
    }

    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ["id", "displayName", "formattedAddress", "location"],
    });

    setInputValue(
      trimPlaceLabel(
        place.displayName ??
          place.formattedAddress ??
          suggestion.primaryText,
      ),
    );
    setSource("google_places");
    setExternalId(place.id ?? suggestion.placePrediction.placeId);
    setLatitude(
      place.location ? String(place.location.lat()) : defaultLatitude?.toString() ?? "",
    );
    setLongitude(
      place.location ? String(place.location.lng()) : defaultLongitude?.toString() ?? "",
    );
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="place-field">
      <input
        ref={inputRef}
        autoComplete="off"
        disabled={disabled}
        onBlur={() => {
          setIsFocused(false);
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => markManual(event.target.value)}
        onFocus={() => {
          setHasUserInteracted(true);
          setIsFocused(true);
          setIsOpen(suggestions.length > 0);
        }}
        onPointerDown={() => setHasUserInteracted(true)}
        placeholder={placeholder}
        type="text"
        value={inputValue}
      />
      <input name={labelName} type="hidden" value={inputValue} />
      <input name={sourceName} type="hidden" value={source} />
      <input name={externalIdName} type="hidden" value={externalId} />
      <input name={latitudeName} type="hidden" value={latitude} />
      <input name={longitudeName} type="hidden" value={longitude} />

      {hasGoogleMapsKey && isOpen && suggestions.length ? (
        <div className="place-field__menu">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onMouseDown={(event) => {
                event.preventDefault();
                void handleSelect(suggestion);
              }}
              type="button"
            >
              <strong>{suggestion.primaryText}</strong>
              <span>{suggestion.secondaryText}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
