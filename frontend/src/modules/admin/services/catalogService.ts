import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";

export type CatalogFieldType = "text" | "number" | "textarea" | "checkbox" | "color";

export type CatalogField = {
  key: string;
  label: string;
  type?: CatalogFieldType;
  required?: boolean;
  placeholder?: string;
};

export type CatalogEntityConfig = {
  key: string;
  label: string;
  description: string;
  endpoint: string;
  fields: CatalogField[];
  displayKeys?: string[];
};

export type CatalogGroupConfig = {
  id: string;
  title: string;
  description: string;
  entities: CatalogEntityConfig[];
};

export const CATALOG_GROUPS: CatalogGroupConfig[] = [
  {
    id: "statuses",
    title: "Statusi",
    description: "Statusi za tekme, turnirje, ekipe, igralce in osebe.",
    entities: [
      {
        key: "match-statuses",
        label: "Statusi tekem",
        description: "scheduled, live, finished…",
        endpoint: "/match-statuses/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "tournament-statuses",
        label: "Statusi turnirjev / edicij",
        description: "draft, ongoing, finished…",
        endpoint: "/tournament-statuses/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "team-statuses",
        label: "Statusi ekip",
        description: "active, inactive…",
        endpoint: "/team-statuses/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "player-statuses",
        label: "Statusi igralcev",
        description: "active, injured…",
        endpoint: "/player-statuses/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "person-statuses",
        label: "Statusi oseb",
        description: "active, archived…",
        endpoint: "/person-statuses/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "match-catalog",
    title: "Tekme — katalog",
    description: "Tipi dogodkov na tekmah.",
    entities: [
      {
        key: "event-types",
        label: "Tipi dogodkov",
        description: "gol, karton, zamenjava…",
        endpoint: "/event-types/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "icon", label: "Ikona" },
          { key: "color", label: "Barva", type: "color" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "tournament-lookups",
    title: "Turnir — šifranti",
    description: "Šport, kategorije, formati.",
    entities: [
      {
        key: "sports",
        label: "Športi",
        description: "Nogomet, košarka…",
        endpoint: "/sports/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
        displayKeys: ["name", "is_active"],
      },
      {
        key: "tournament-categories",
        label: "Kategorije",
        description: "Trojke, U15…",
        endpoint: "/tournament-categories/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "slug", label: "Slug", required: true },
          { key: "description", label: "Opis", type: "textarea" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "tournament-formats",
        label: "Formati",
        description: "Skupine + KO, liga…",
        endpoint: "/tournament-formats/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "description", label: "Opis", type: "textarea" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
    ],
  },
  {
    id: "awards-sponsors",
    title: "Nagrade in sponzorji",
    description: "Katalog nagrad in sponzorjev (ne dodelitve na ediciji).",
    entities: [
      {
        key: "awards",
        label: "Nagrade",
        description: "MVP, strelec…",
        endpoint: "/awards/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda" },
          { key: "description", label: "Opis", type: "textarea" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "sponsors",
        label: "Sponzorji",
        description: "Sponzorji nagradnih skladov",
        endpoint: "/sponsors/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "website", label: "Splet" },
          { key: "description", label: "Opis", type: "textarea" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
        displayKeys: ["name", "website", "is_active"],
      },
    ],
  },
  {
    id: "people-geo",
    title: "Osebe in geo",
    description: "Vloge oseb in države.",
    entities: [
      {
        key: "person-role-types",
        label: "Vloge oseb",
        description: "igralec, sodnik, trener…",
        endpoint: "/person-role-types/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "description", label: "Opis", type: "textarea" },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
      {
        key: "countries",
        label: "Države",
        description: "Državljanstva / zastave",
        endpoint: "/countries/",
        fields: [
          { key: "name", label: "Ime", required: true },
          { key: "code", label: "Koda", required: true },
          { key: "iso2", label: "ISO2 / zastava", required: true },
          { key: "order", label: "Vrstni red", type: "number" },
          { key: "is_active", label: "Aktivno", type: "checkbox" },
        ],
      },
    ],
  },
];

export type CatalogRow = Record<string, unknown> & { id: number };

function normalizeList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export const catalogAdminService = {
  async list(endpoint: string, params?: QueryParams) {
    const data = await api.get<CatalogRow[] | PaginatedResponse<CatalogRow>>(
      endpoint,
      { params },
    );
    return normalizeList(data);
  },

  create(endpoint: string, body: Record<string, unknown>) {
    return api.post<CatalogRow>(endpoint, body);
  },

  update(endpoint: string, id: number, body: Record<string, unknown>) {
    return api.patch<CatalogRow>(`${endpoint}${id}/`, body);
  },

  delete(endpoint: string, id: number) {
    return api.delete<void>(`${endpoint}${id}/`);
  },
};
