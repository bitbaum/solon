/**
 * The Classification of the Functions of Government (COFOG): what public
 * money is spent on, in the United Nations' ten divisions and their groups,
 * as Eurostat publishes it with its government finance statistics. The labels
 * in English, German and French are Eurostat's own (the `cofog99` dimension of
 * `gov_10a_exp`, read 2026-11-10); Italian and Russian are Solon's, for the
 * divisions only, and a group falls back to English in those languages.
 *
 * Every budget Solon holds is placed on this one classification, whatever
 * its publisher's own codes, so any two can be compared.
 */
import { defineTaxonomy } from "@/lib/budgets/taxonomy";

export const COFOG = defineTaxonomy({
  key: "cofog",
  side: "expenditure",
  total: "TOTAL",
  categories: [
    {
      code: "TOTAL",
      parent: null,
      label: { en: "Total", de: "Insgesamt", fr: "Total", it: "Totale", ru: "Всего" },
    },
    {
      code: "GF01",
      parent: "TOTAL",
      label: {
        en: "General public services",
        de: "Allgemeine öffentliche Verwaltung",
        fr: "Services généraux des administrations publiques",
        it: "Servizi pubblici generali",
        ru: "Общегосударственные вопросы",
      },
    },
    {
      code: "GF0101",
      parent: "GF01",
      label: {
        en: "Executive and legislative organs, financial and fiscal affairs, external affairs",
        de: "Exekutiv- und Legislativorgane, Finanz- und Steuerwesen, auswärtige Angelegenheiten",
        fr: "Fonctionnement des organes exécutifs et législatifs, affaires financières et fiscales, affaires étrangères",
      },
    },
    {
      code: "GF0102",
      parent: "GF01",
      label: {
        en: "Foreign economic aid",
        de: "Wirtschaftshilfe für das Ausland",
        fr: "Aide économique extérieure",
      },
    },
    {
      code: "GF0103",
      parent: "GF01",
      label: { en: "General services", de: "Allgemeine Dienste", fr: "Services généraux" },
    },
    {
      code: "GF0104",
      parent: "GF01",
      label: { en: "Basic research", de: "Grundlagenforschung", fr: "Recherche fondamentale" },
    },
    {
      code: "GF0105",
      parent: "GF01",
      label: {
        en: "R&D General public services",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich allgemeine öffentliche Verwaltung",
        fr: "R & D concernant des services généraux des administrations publiques",
      },
    },
    {
      code: "GF0106",
      parent: "GF01",
      label: {
        en: "General public services n.e.c.",
        de: "Allgemeine öffentliche Verwaltung, a.n.g.",
        fr: "Services généraux des administrations publiques n.c.a.",
      },
    },
    {
      code: "GF0107",
      parent: "GF01",
      label: {
        en: "Public debt transactions",
        de: "Staatsschuldentransaktionen",
        fr: "Opérations concernant la dette publique",
      },
    },
    {
      code: "GF0108",
      parent: "GF01",
      label: {
        en: "Transfers of a general character between different levels of government",
        de: "Transfers allgemeiner Art zwischen verschiedenen staatlichen Ebenen",
        fr: "Transferts de caractère général entre administrations publiques",
      },
    },
    {
      code: "GF02",
      parent: "TOTAL",
      label: { en: "Defence", de: "Verteidigung", fr: "Défense", it: "Difesa", ru: "Оборона" },
    },
    {
      code: "GF0201",
      parent: "GF02",
      label: { en: "Military defence", de: "Militärische Verteidigung", fr: "Défense militaire" },
    },
    {
      code: "GF0202",
      parent: "GF02",
      label: { en: "Civil defence", de: "Zivile Verteidigung", fr: "Défense civile" },
    },
    {
      code: "GF0203",
      parent: "GF02",
      label: {
        en: "Foreign military aid",
        de: "Militärhilfe für das Ausland",
        fr: "Aide militaire à des pays étrangers",
      },
    },
    {
      code: "GF0204",
      parent: "GF02",
      label: {
        en: "R&D Defence",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Verteidigung",
        fr: "R & D concernant la défense",
      },
    },
    {
      code: "GF0205",
      parent: "GF02",
      label: { en: "Defence n.e.c.", de: "Verteidigung, a.n.g.", fr: "Défense n.c.a." },
    },
    {
      code: "GF03",
      parent: "TOTAL",
      label: {
        en: "Public order and safety",
        de: "Öffentliche Ordnung und Sicherheit",
        fr: "Ordre et sécurité publics",
        it: "Ordine pubblico e sicurezza",
        ru: "Общественный порядок и безопасность",
      },
    },
    {
      code: "GF0301",
      parent: "GF03",
      label: { en: "Police services", de: "Polizei", fr: "Services de police" },
    },
    {
      code: "GF0302",
      parent: "GF03",
      label: {
        en: "Fire-protection services",
        de: "Feuerwehr",
        fr: "Services de protection civile",
      },
    },
    {
      code: "GF0303",
      parent: "GF03",
      label: { en: "Law courts", de: "Gerichte", fr: "Tribunaux" },
    },
    {
      code: "GF0304",
      parent: "GF03",
      label: { en: "Prisons", de: "Justizvollzug", fr: "Administration pénitentiaire" },
    },
    {
      code: "GF0305",
      parent: "GF03",
      label: {
        en: "R&D Public order and safety",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich öffentliche Ordnung und Sicherheit",
        fr: "R & D concernant l'ordre et la sécurité publics",
      },
    },
    {
      code: "GF0306",
      parent: "GF03",
      label: {
        en: "Public order and safety n.e.c.",
        de: "Öffentliche Ordnung und Sicherheit, a.n.g.",
        fr: "Ordre et sécurité publics n.c.a.",
      },
    },
    {
      code: "GF04",
      parent: "TOTAL",
      label: {
        en: "Economic affairs",
        de: "Wirtschaftliche Angelegenheiten",
        fr: "Affaires économiques",
        it: "Affari economici",
        ru: "Экономические вопросы",
      },
    },
    {
      code: "GF0401",
      parent: "GF04",
      label: {
        en: "General economic, commercial and labour affairs",
        de: "Allgemeine Angelegenheiten der Wirtschaft und des Arbeitsmarkts",
        fr: "Tutelle de l'économie générale, des échanges et de l'emploi",
      },
    },
    {
      code: "GF0402",
      parent: "GF04",
      label: {
        en: "Agriculture, forestry, fishing and hunting",
        de: "Land- und Forstwirtschaft, Fischerei und Jagd",
        fr: "Agriculture, sylviculture, pêche et chasse",
      },
    },
    {
      code: "GF0403",
      parent: "GF04",
      label: {
        en: "Fuel and energy",
        de: "Brennstoffe und Energie",
        fr: "Combustibles et énergie",
      },
    },
    {
      code: "GF0404",
      parent: "GF04",
      label: {
        en: "Mining, manufacturing and construction",
        de: "Bergbau, Herstellung von Waren und Bauwesen",
        fr: "Industries extractives et manufacturières, construction",
      },
    },
    { code: "GF0405", parent: "GF04", label: { en: "Transport", de: "Verkehr", fr: "Transports" } },
    {
      code: "GF0406",
      parent: "GF04",
      label: { en: "Communication", de: "Nachrichtenübermittlung", fr: "Communications" },
    },
    {
      code: "GF0407",
      parent: "GF04",
      label: {
        en: "Other industries",
        de: "Andere Wirtschaftsbereiche",
        fr: "Autres branches d'activité",
      },
    },
    {
      code: "GF0408",
      parent: "GF04",
      label: {
        en: "R&D Economic affairs",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich wirtschaftliche Angelegenheiten",
        fr: "R & D concernant les affaires économiques",
      },
    },
    {
      code: "GF0409",
      parent: "GF04",
      label: {
        en: "Economic affairs n.e.c.",
        de: "Wirtschaftliche Angelegenheiten, a.n.g.",
        fr: "Affaires économiques n.c.a.",
      },
    },
    {
      code: "GF05",
      parent: "TOTAL",
      label: {
        en: "Environmental protection",
        de: "Umweltschutz",
        fr: "Protection de l'environnement",
        it: "Protezione dell'ambiente",
        ru: "Охрана окружающей среды",
      },
    },
    {
      code: "GF0501",
      parent: "GF05",
      label: { en: "Waste management", de: "Abfallwirtschaft", fr: "Gestion des déchets" },
    },
    {
      code: "GF0502",
      parent: "GF05",
      label: {
        en: "Waste water management",
        de: "Abwasserwirtschaft",
        fr: "Gestion des eaux usées",
      },
    },
    {
      code: "GF0503",
      parent: "GF05",
      label: {
        en: "Pollution abatement",
        de: "Vermeidung und Beseitigung von Umweltverunreinigungen",
        fr: "Lutte contre la pollution",
      },
    },
    {
      code: "GF0504",
      parent: "GF05",
      label: {
        en: "Protection of biodiversity and landscape",
        de: "Arten- und Landschaftsschutz",
        fr: "Préservation de la diversité biologique et protection de la nature",
      },
    },
    {
      code: "GF0505",
      parent: "GF05",
      label: {
        en: "R&D Environmental protection",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Umweltschutz",
        fr: "R & D dans le domaine de la protection de l'environnement",
      },
    },
    {
      code: "GF0506",
      parent: "GF05",
      label: {
        en: "Environmental protection n.e.c.",
        de: "Umweltschutz, a.n.g.",
        fr: "Protection de l'environnement n.c.a.",
      },
    },
    {
      code: "GF06",
      parent: "TOTAL",
      label: {
        en: "Housing and community amenities",
        de: "Wohnungswesen und kommunale Einrichtungen",
        fr: "Logements et équipements collectifs",
        it: "Abitazioni e assetto territoriale",
        ru: "Жилищно-коммунальное хозяйство",
      },
    },
    {
      code: "GF0601",
      parent: "GF06",
      label: { en: "Housing development", de: "Wohnungswesen", fr: "Logements" },
    },
    {
      code: "GF0602",
      parent: "GF06",
      label: { en: "Community development", de: "Raumplanung", fr: "Équipements collectifs" },
    },
    {
      code: "GF0603",
      parent: "GF06",
      label: { en: "Water supply", de: "Wasserversorgung", fr: "Alimentation en eau" },
    },
    {
      code: "GF0604",
      parent: "GF06",
      label: { en: "Street lighting", de: "Straßenbeleuchtung", fr: "Éclairage public" },
    },
    {
      code: "GF0605",
      parent: "GF06",
      label: {
        en: "R&D Housing and community amenities",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Wohnungswesen und kommunale Einrichtungen",
        fr: "R & D dans le domaine du logement et des équipements collectifs",
      },
    },
    {
      code: "GF0606",
      parent: "GF06",
      label: {
        en: "Housing and community amenities n.e.c.",
        de: "Wohnungswesen und kommunale Einrichtungen, a.n.g.",
        fr: "Logement et équipements collectifs n.c.a.",
      },
    },
    {
      code: "GF07",
      parent: "TOTAL",
      label: {
        en: "Health",
        de: "Gesundheitswesen",
        fr: "Santé",
        it: "Sanità",
        ru: "Здравоохранение",
      },
    },
    {
      code: "GF0701",
      parent: "GF07",
      label: {
        en: "Medical products, appliances and equipment",
        de: "Medizinische Erzeugnisse, Geräte und Ausrüstungen",
        fr: "Produits, appareils et matériels médicaux",
      },
    },
    {
      code: "GF0702",
      parent: "GF07",
      label: { en: "Outpatient services", de: "Ambulante Behandlung", fr: "Services ambulatoires" },
    },
    {
      code: "GF0703",
      parent: "GF07",
      label: { en: "Hospital services", de: "Stationäre Behandlung", fr: "Services hospitaliers" },
    },
    {
      code: "GF0704",
      parent: "GF07",
      label: {
        en: "Public health services",
        de: "Öffentlicher Gesundheitsdienst",
        fr: "Services de santé publique",
      },
    },
    {
      code: "GF0705",
      parent: "GF07",
      label: {
        en: "R&D Health",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Gesundheitswesen",
        fr: "R & D dans le domaine de la santé",
      },
    },
    {
      code: "GF0706",
      parent: "GF07",
      label: { en: "Health n.e.c.", de: "Gesundheitswesen, a.n.g.", fr: "Santé n.c.a." },
    },
    {
      code: "GF08",
      parent: "TOTAL",
      label: {
        en: "Recreation, culture and religion",
        de: "Freizeitgestaltung, Kultur und Religion",
        fr: "Loisirs, culture et culte",
        it: "Attività ricreative, culturali e di culto",
        ru: "Отдых, культура и религия",
      },
    },
    {
      code: "GF0801",
      parent: "GF08",
      label: {
        en: "Recreational and sporting services",
        de: "Freizeitgestaltung und Sport",
        fr: "Services récréatifs et sportifs",
      },
    },
    {
      code: "GF0802",
      parent: "GF08",
      label: { en: "Cultural services", de: "Kultur", fr: "Services culturels" },
    },
    {
      code: "GF0803",
      parent: "GF08",
      label: {
        en: "Broadcasting and publishing services",
        de: "Rundfunk- und Verlagswesen",
        fr: "Services de radiodiffusion, de télévision et d'édition",
      },
    },
    {
      code: "GF0804",
      parent: "GF08",
      label: {
        en: "Religious and other community services",
        de: "Religiöse und andere Gemeinschaftsangelegenheiten",
        fr: "Culte et autres services communautaires",
      },
    },
    {
      code: "GF0805",
      parent: "GF08",
      label: {
        en: "R&D Recreation, culture and religion",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Freizeitgestaltung, Sport, Kultur und Religion",
        fr: "R & D dans le domaine des loisirs, de la culture et du culte",
      },
    },
    {
      code: "GF0806",
      parent: "GF08",
      label: {
        en: "Recreation, culture and religion n.e.c.",
        de: "Freizeitgestaltung, Sport, Kultur und Religion, a.n.g.",
        fr: "Loisirs, culture et culte n.c.a.",
      },
    },
    {
      code: "GF09",
      parent: "TOTAL",
      label: {
        en: "Education",
        de: "Bildungswesen",
        fr: "Enseignement",
        it: "Istruzione",
        ru: "Образование",
      },
    },
    {
      code: "GF0901",
      parent: "GF09",
      label: {
        en: "Pre-primary and primary education",
        de: "Elementar- und Primärbereich",
        fr: "Enseignement préélémentaire et primaire",
      },
    },
    {
      code: "GF0902",
      parent: "GF09",
      label: { en: "Secondary education", de: "Sekundarbereich", fr: "Enseignement secondaire" },
    },
    {
      code: "GF0903",
      parent: "GF09",
      label: {
        en: "Post-secondary non-tertiary education",
        de: "Post-sekundarer, nicht-tertiärer Bereich",
        fr: "Enseignement postsecondaire non supérieur",
      },
    },
    {
      code: "GF0904",
      parent: "GF09",
      label: { en: "Tertiary education", de: "Tertiärbereich", fr: "Enseignement supérieur" },
    },
    {
      code: "GF0905",
      parent: "GF09",
      label: {
        en: "Education not definable by level",
        de: "Nicht zuordenbares Bildungswesen",
        fr: "Enseignement non défini par niveau",
      },
    },
    {
      code: "GF0906",
      parent: "GF09",
      label: {
        en: "Subsidiary services to education",
        de: "Hilfsdienstleistungen für das Bildungswesen",
        fr: "Services annexes à l'enseignement",
      },
    },
    {
      code: "GF0907",
      parent: "GF09",
      label: {
        en: "R&D Education",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich Bildungswesen",
        fr: "R & D dans le domaine de l'enseignement",
      },
    },
    {
      code: "GF0908",
      parent: "GF09",
      label: { en: "Education n.e.c.", de: "Bildungswesen, a.n.g.", fr: "Enseignement n.c.a." },
    },
    {
      code: "GF10",
      parent: "TOTAL",
      label: {
        en: "Social protection",
        de: "Soziale Sicherung",
        fr: "Protection sociale",
        it: "Protezione sociale",
        ru: "Социальная защита",
      },
    },
    {
      code: "GF1001",
      parent: "GF10",
      label: {
        en: "Sickness and disability",
        de: "Krankheit und Erwerbsunfähigkeit",
        fr: "Maladie et invalidité",
      },
    },
    { code: "GF1002", parent: "GF10", label: { en: "Old age", de: "Alter", fr: "Vieillesse" } },
    {
      code: "GF1003",
      parent: "GF10",
      label: { en: "Survivors", de: "Hinterbliebene", fr: "Survivants" },
    },
    {
      code: "GF1004",
      parent: "GF10",
      label: { en: "Family and children", de: "Familien und Kinder", fr: "Famille et enfants" },
    },
    {
      code: "GF1005",
      parent: "GF10",
      label: { en: "Unemployment", de: "Arbeitslosigkeit", fr: "Chômage" },
    },
    { code: "GF1006", parent: "GF10", label: { en: "Housing", de: "Wohnraum", fr: "Logement" } },
    {
      code: "GF1007",
      parent: "GF10",
      label: {
        en: "Social exclusion n.e.c.",
        de: "Soziale Hilfe, a.n.g.",
        fr: "Exclusion sociale n.c.a.",
      },
    },
    {
      code: "GF1008",
      parent: "GF10",
      label: {
        en: "R&D Social protection",
        de: "Angewandte Forschung und experimentelle Entwicklung im Bereich soziale Sicherung",
        fr: "R & D dans le domaine de la protection sociale",
      },
    },
    {
      code: "GF1009",
      parent: "GF10",
      label: {
        en: "Social protection n.e.c.",
        de: "Soziale Sicherung, a.n.g.",
        fr: "Protection sociale n.c.a.",
      },
    },
  ],
});
