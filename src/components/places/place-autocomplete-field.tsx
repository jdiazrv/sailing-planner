"use client";

import { useEffect, useRef, useState } from "react";

import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";
import { recordApiUsage } from "@/lib/api-usage";
import { getGreekCoastalZonesLazy } from "@/lib/coastal-zones-runtime";

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
  kind: "google";
  id: string;
  primaryText: string;
  secondaryText: string;
  placePrediction: google.maps.places.PlacePrediction;
};

type ZoneSuggestion = {
  kind: "zone";
  id: string;
  primaryText: string;
  secondaryText: string;
  searchText: string;
  aliasesNormalized: string[];
  latitude?: number;
  longitude?: number;
};

type AutocompleteSuggestion = Suggestion | ZoneSuggestion;

let curatedZoneSuggestionsPromise: Promise<ZoneSuggestion[]> | null = null;

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

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getCuratedZoneSuggestions = async () => {
  if (!curatedZoneSuggestionsPromise) {
    curatedZoneSuggestionsPromise = getGreekCoastalZonesLazy()
      .then((zones) =>
        zones
          .filter((zone) => zone.kind === "macro_zone")
          .map((zone) => {
            const spanishAlias = zone.aliases.find((alias) =>
              /jonic|ciclad|egeo|dodec|creta|golfo|arco|norte|sur|oeste|este/i.test(alias),
            );

            return {
              kind: "zone" as const,
              id: `zone-${zone.id}`,
              primaryText: zone.name,
              secondaryText: spanishAlias
                ? `${spanishAlias} · Zona curada`
                : "Zona curada · Curated zone",
              searchText: normalizeSearchText([zone.name, ...zone.aliases].join(" ")),
              aliasesNormalized: [zone.name, ...zone.aliases]
                .map((value) => normalizeSearchText(value))
                .filter(Boolean),
              latitude: zone.centerLatitude,
              longitude: zone.centerLongitude,
            };
          }),
      )
      .catch(() => []);
  }

  return curatedZoneSuggestionsPromise;
};

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
  const [googleSuggestions, setGoogleSuggestions] = useState<Suggestion[]>([]);
  const [curatedZoneSuggestions, setCuratedZoneSuggestions] = useState<ZoneSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [debouncedInputValue, setDebouncedInputValue] = useState(inputValue);

  const zoneSuggestions = (() => {
    const query = normalizeSearchText(debouncedInputValue);
    if (query.length < 2) {
      return [] as ZoneSuggestion[];
    }

    return curatedZoneSuggestions
      .map((suggestion) => {
        const primary = normalizeSearchText(suggestion.primaryText);
        const indexed = suggestion.searchText;
        const score =
          primary === query || indexed === query
            ? 1000 + query.length
            : primary.includes(query) || indexed.includes(query)
              ? 100 + query.length
              : -1;

        return { suggestion, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.suggestion)
      .slice(0, 6);
  })();

  const suggestions: AutocompleteSuggestion[] = [
    ...zoneSuggestions,
    ...googleSuggestions,
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [inputValue]);

  useEffect(() => {
    if (disabled || !hasUserInteracted) {
      return;
    }

    let cancelled = false;

    void getCuratedZoneSuggestions().then((suggestions) => {
      if (!cancelled) {
        setCuratedZoneSuggestions(suggestions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [disabled, hasUserInteracted]);

  useEffect(() => {
    if (!hasGoogleMapsKey || disabled || !hasUserInteracted || !isFocused) {
      return;
    }

    const trimmed = debouncedInputValue.trim();
    if (trimmed.length < 3) {
      setGoogleSuggestions([]);
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
          kind: "google" as const,
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

      setGoogleSuggestions(nextSuggestions);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedInputValue, disabled, hasUserInteracted, isFocused]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setIsOpen(suggestions.length > 0);
  }, [isFocused, suggestions.length]);

  const markManual = (nextValue: string) => {
    setInputValue(nextValue);
    setSource("manual");
    setExternalId("");
    setLatitude("");
    setLongitude("");
  };

  const applyCuratedZoneFromInput = () => {
    const query = normalizeSearchText(inputValue);
    if (!query) {
      return;
    }

    void getCuratedZoneSuggestions().then((suggestions) => {
      const matchedZone = suggestions.find((zone) =>
        zone.aliasesNormalized.includes(query),
      );

      if (!matchedZone) {
        return;
      }

      setCuratedZoneSuggestions(suggestions);
      setInputValue(matchedZone.primaryText);
      setSource("manual");
      setExternalId("");
      setLatitude(
        typeof matchedZone.latitude === "number" ? String(matchedZone.latitude) : "",
      );
      setLongitude(
        typeof matchedZone.longitude === "number" ? String(matchedZone.longitude) : "",
      );
    });
  };

  const handleSelect = async (suggestion: AutocompleteSuggestion) => {
    if (suggestion.kind === "zone") {
      setInputValue(suggestion.primaryText);
      setSource("manual");
      setExternalId("");
      setLatitude(
        typeof suggestion.latitude === "number" ? String(suggestion.latitude) : "",
      );
      setLongitude(
        typeof suggestion.longitude === "number" ? String(suggestion.longitude) : "",
      );
      setGoogleSuggestions([]);
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    const maps = await loadGoogleMaps();
    if (!maps) {
      return;
    }

    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({
      fields: ["id", "displayName", "formattedAddress", "location"],
    });
    // One autocomplete session (all keystrokes collapsed by session token) + one place details call.
    void recordApiUsage("google_places", "autocomplete_session");
    void recordApiUsage("google_places", "place_details_essentials");

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
    setGoogleSuggestions([]);
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
          applyCuratedZoneFromInput();
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

      {isOpen && suggestions.length ? (
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
