/**
 * Where public money comes from, on the European System of Accounts (ESA 2010)
 * as Eurostat publishes it for general government (`na_item` of
 * `gov_10a_main`). The divisions add up to total revenue (TR) exactly, in the
 * accounts' own identity; a group under one (income tax under taxes on income
 * and wealth) need not cover all of it, and a drill-down shows the rest.
 *
 * `label` is Eurostat's (English, German, French, read 2026-11-10); `plain`
 * is Solon's name for a reader, in every language the site speaks.
 */
import { defineTaxonomy } from "@/lib/budgets/taxonomy";

export const ESA_REVENUE = defineTaxonomy({
  key: "esa_revenue",
  side: "revenue",
  total: "TR",
  categories: [
    {
      code: "TR",
      parent: null,
      label: {
        en: "Total general government revenue",
        de: "Gesamteinnahmen des Staates",
        fr: "Total des recettes des administrations publiques",
      },
      plain: {
        en: "Total revenue",
        de: "Gesamte Einnahmen",
        fr: "Total des recettes",
        it: "Entrate totali",
        ru: "Все доходы",
      },
    },
    {
      code: "D5REC",
      parent: "TR",
      label: {
        en: "Current taxes on income, wealth, etc., revenue",
        de: "Einkommen- und Vermögensteuern, Einnahmen",
        fr: "Impôts courants sur le revenu, le patrimoine, etc., recettes",
      },
      plain: {
        en: "Taxes on income and wealth",
        de: "Steuern auf Einkommen und Vermögen",
        fr: "Impôts sur le revenu et le patrimoine",
        it: "Imposte sul reddito e sul patrimonio",
        ru: "Налоги на доходы и имущество",
      },
    },
    {
      code: "D51REC",
      parent: "D5REC",
      label: {
        en: "Taxes on income, revenue",
        de: "Einkommensteuern, Einnahmen",
        fr: "Impôts sur le revenu, recettes",
      },
      plain: {
        en: "Taxes on income",
        de: "Einkommensteuern",
        fr: "Impôts sur le revenu",
        it: "Imposte sul reddito",
        ru: "Налоги на доходы",
      },
    },
    {
      code: "D59REC",
      parent: "D5REC",
      label: {
        en: "Other current taxes, revenue",
        de: "Sonstige direkte Steuern und Abgaben, Einnahmen",
        fr: "Autres impôts courants, recettes",
      },
      plain: {
        en: "Other taxes on wealth and income",
        de: "Andere Steuern auf Einkommen und Vermögen",
        fr: "Autres impôts sur le revenu et le patrimoine",
        it: "Altre imposte sul reddito e sul patrimonio",
        ru: "Прочие налоги на доходы и имущество",
      },
    },
    {
      code: "D2REC",
      parent: "TR",
      label: {
        en: "Taxes on production and imports, revenue",
        de: "Produktions- und Importabgaben, Einnahmen",
        fr: "Impôts sur la production et les importations, recettes",
      },
      plain: {
        en: "Taxes on sales, production and imports",
        de: "Steuern auf Verkäufe, Produktion und Importe",
        fr: "Impôts sur les ventes, la production et les importations",
        it: "Imposte su vendite, produzione e importazioni",
        ru: "Налоги на продажи, производство и импорт",
      },
    },
    {
      code: "D211REC",
      parent: "D2REC",
      label: {
        en: "Value added type taxes (VAT), revenue",
        de: "Empfangene Mehrwertsteuer",
        fr: "Impôts de type « taxe sur la valeur ajoutée (TVA) », recettes",
      },
      plain: {
        en: "Value added tax",
        de: "Mehrwertsteuer",
        fr: "Taxe sur la valeur ajoutée",
        it: "Imposta sul valore aggiunto",
        ru: "Налог на добавленную стоимость",
      },
    },
    {
      code: "D61REC",
      parent: "TR",
      label: {
        en: "Net social contributions, revenue",
        de: "Nettosozialbeiträge, Einnahmen",
        fr: "Cotisations sociales nettes, recettes",
      },
      plain: {
        en: "Social contributions",
        de: "Sozialbeiträge",
        fr: "Cotisations sociales",
        it: "Contributi sociali",
        ru: "Социальные взносы",
      },
    },
    {
      code: "P11_P12_P131",
      parent: "TR",
      label: {
        en: "Market output, output for own final use and payments for non-market output",
        de: "Marktproduktion, Produktion für die Eigenverwendung und Zahlungen für Nichtmarktproduktion",
        fr: "Production marchande, production pour usage final propre et paiements au titre de production non marchande",
      },
      plain: {
        en: "Sales, fees and charges",
        de: "Verkäufe, Gebühren und Entgelte",
        fr: "Ventes, redevances et droits",
        it: "Vendite, tariffe e diritti",
        ru: "Продажи, сборы и платежи",
      },
    },
    {
      code: "D4REC",
      parent: "TR",
      label: {
        en: "Property income, revenue",
        de: "Vermögenseinkommen, Einnahmen",
        fr: "Revenus de la propriété, recettes",
      },
      plain: {
        en: "Income from property (interest, dividends, rent)",
        de: "Vermögenseinkommen (Zinsen, Dividenden, Pacht)",
        fr: "Revenus de la propriété (intérêts, dividendes, loyers)",
        it: "Redditi da proprietà (interessi, dividendi, affitti)",
        ru: "Доходы от собственности (проценты, дивиденды, аренда)",
      },
    },
    {
      code: "D7REC",
      parent: "TR",
      label: {
        en: "Other current transfers, revenue",
        de: "Sonstige laufende Transfers, Einnahmen",
        fr: "Autres transferts courants, recettes",
      },
      plain: {
        en: "Other transfers received",
        de: "Andere erhaltene Transfers",
        fr: "Autres transferts reçus",
        it: "Altri trasferimenti ricevuti",
        ru: "Прочие полученные трансферты",
      },
    },
    {
      code: "D9REC",
      parent: "TR",
      label: {
        en: "Capital transfers, revenue",
        de: "Vermögenstransfers, Einnahmen",
        fr: "Transferts en capital, recettes",
      },
      plain: {
        en: "Capital transfers and taxes received",
        de: "Erhaltene Vermögenstransfers und -steuern",
        fr: "Transferts et impôts en capital reçus",
        it: "Trasferimenti e imposte in conto capitale ricevuti",
        ru: "Полученные капитальные трансферты и налоги",
      },
    },
    {
      code: "D39REC",
      parent: "TR",
      label: {
        en: "Other subsidies on production, revenue",
        de: "Sonstige Subventionen, Einnahmen",
        fr: "Autres subventions sur la production, recettes",
      },
      plain: {
        en: "Subsidies received",
        de: "Erhaltene Subventionen",
        fr: "Subventions reçues",
        it: "Sovvenzioni ricevute",
        ru: "Полученные субсидии",
      },
    },
  ],
});
