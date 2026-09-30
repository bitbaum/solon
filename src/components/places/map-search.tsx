"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { searchAddresses, type AddressHit } from "@/lib/places/address-search";
import { findPlaces, type MapData, type MapPlace } from "@/lib/places/map-view";

type Option =
  { kind: "place"; place: MapPlace; detail: string | null } | { kind: "address"; hit: AddressHit };

interface MapSearchProps {
  data: MapData;
  onPlace: (place: MapPlace) => void;
  onAddress: (hit: AddressHit) => void;
}

const DEBOUNCE_MS = 200;
const PLACES_SHOWN = 6;
const ADDRESSES_SHOWN = 4;

const optionKey = (o: Option) =>
  o.kind === "place" ? `place-${o.place.feature}` : `address-${o.hit.label}`;

/**
 * One box for an address, a place or a postcode. Names match on the device;
 * a postcode asks Solon which places it spans; an address goes from the
 * browser straight to the pack's address search, and the note under the box
 * says so.
 */
export default function MapSearch({ data, onPlace, onAddress }: MapSearchProps) {
  const t = useTranslations("Places.map");
  const locale = useLocale();
  const id = useId();
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const query = text.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const local: Option[] = findPlaces(data.places, query, PLACES_SHOWN).map((place) => ({
        kind: "place",
        place,
        detail: null,
      }));
      const byPostcode = /\d/.test(query) && query.length >= 4 ? postcodePlaces(query) : [];
      const addresses =
        data.addressSearch && query.length >= 4 && !/^\d+$/.test(query)
          ? searchAddresses(data.addressSearch, query, controller.signal, ADDRESSES_SHOWN).catch(
              () => [],
            )
          : Promise.resolve([]);
      const [postcode, found] = await Promise.all([byPostcode, addresses]);
      if (controller.signal.aborted) {
        return;
      }
      const seen = new Set<string>();
      const next = [
        ...postcode,
        ...local,
        ...found.map((hit) => ({ kind: "address", hit }) as const),
      ].filter((o) => !seen.has(optionKey(o)) && seen.add(optionKey(o)));
      setOptions(next);
      setActive(0);
      setPending(false);
    }, DEBOUNCE_MS);

    async function postcodePlaces(q: string): Promise<Option[]> {
      try {
        const response = await fetch(`/api/v1/places?q=${encodeURIComponent(q)}&locale=${locale}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          kind?: string;
          places?: { slugPath: string; localities?: { name: string }[] | null }[];
        };
        if (body.kind !== "postcode") {
          return [];
        }
        return (body.places ?? []).flatMap((hit) => {
          const place = data.places.find((p) => p.slugPath === hit.slugPath);
          return place
            ? [
                {
                  kind: "place" as const,
                  place,
                  detail: t("postcodeIn", {
                    postcode: q,
                    localities: (hit.localities ?? []).map((l) => l.name).join(", "),
                  }),
                },
              ]
            : [];
        });
      } catch {
        return [];
      }
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, data, locale, t]);

  const choose = (option: Option | undefined) => {
    if (!option) {
      return;
    }
    setOpen(false);
    if (option.kind === "place") {
      setText(option.place.name);
      onPlace(option.place);
    } else {
      setText(option.hit.label);
      onAddress(option.hit);
    }
  };

  const listId = `${id}-options`;
  const shown = open && text.trim().length >= 2;
  const places = options.filter((o) => o.kind === "place");
  const addresses = options.filter((o) => o.kind === "address");
  const optionId = (o: Option) => `${id}-${optionKey(o)}`;
  const row = (o: Option) => {
    const i = options.indexOf(o);
    return (
      <li
        key={optionKey(o)}
        id={optionId(o)}
        role="option"
        aria-selected={i === active}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choose(o)}
        onMouseEnter={() => setActive(i)}
        className={`cursor-pointer px-4 py-2 text-sm ${
          i === active ? "bg-surface-raised text-fg-primary" : "text-fg-secondary"
        }`}
      >
        {o.kind === "place" ? (
          <>
            <span className="font-medium text-fg-primary">{o.place.name}</span>
            {(o.detail ?? o.place.parentName) && (
              <span className="block text-xs text-fg-tertiary">
                {o.detail ?? o.place.parentName}
              </span>
            )}
          </>
        ) : (
          <span className="text-fg-primary">{o.hit.label}</span>
        )}
      </li>
    );
  };
  const heading = (label: string) => (
    <li
      role="presentation"
      className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-caps text-fg-tertiary"
    >
      {label}
    </li>
  );

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="block text-sm font-medium text-fg-primary">
        {t(data.addressSearch ? "searchLabel" : "searchLabelNoAddress")}
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={shown && options[active] ? optionId(options[active]!) : undefined}
        aria-describedby={data.addressSearch ? `${id}-note` : undefined}
        autoComplete="off"
        value={text}
        placeholder={t(data.addressSearch ? "searchPlaceholder" : "searchPlaceholderNoAddress")}
        onChange={(e) => {
          setText(e.target.value);
          setPending(true);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="field mt-2"
      />
      {data.addressSearch && (
        <p id={`${id}-note`} className="mt-2 text-xs text-fg-tertiary">
          {t("searchNote", { provider: data.addressSearch.provider })}
        </p>
      )}
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("searchResults")}
          className="absolute inset-x-0 top-[4.75rem] z-20 max-h-80 overflow-y-auto rounded-surface border border-default bg-surface-overlay py-1"
        >
          {options.length === 0 ? (
            <li role="presentation" className="px-4 py-3 text-sm text-fg-tertiary">
              {pending ? t("searching") : t("searchNothing")}
            </li>
          ) : (
            <>
              {places.length > 0 && addresses.length > 0 && heading(t("searchPlaces"))}
              {places.map(row)}
              {addresses.length > 0 && heading(t("searchAddresses"))}
              {addresses.map(row)}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
