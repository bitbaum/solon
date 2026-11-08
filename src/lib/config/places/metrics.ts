import type { MetricInput } from "./schema";

/**
 * The metric catalog: what a fact can measure, its value type, unit and
 * plausible band (§4.6). Synced to `place_metrics`, which facts reference.
 */
export const METRICS: readonly MetricInput[] = [
  {
    key: "tax.income.tariff",
    label: {
      en: "Income tax tariff",
      de: "Einkommenssteuertarif",
      fr: "barème de l'impôt sur le revenu",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // A tariff whose amount is then multiplied by the multipliers of several levels.
    key: "tax.income.tariff.basic",
    label: {
      en: "Basic income tax tariff",
      de: "Grundtarif Einkommenssteuer (einfache Steuer)",
      fr: "barème de base de l'impôt sur le revenu",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff a canton's communes apply their multipliers to: the basic
    // tariff in most cantons, one of their own in Schwyz.
    key: "tax.income.tariff.communal",
    label: {
      en: "Communal income tax tariff",
      de: "Tarif der Gemeindesteuer auf dem Einkommen",
      fr: "barème de l'impôt communal sur le revenu",
      it: "tariffa dell'imposta comunale sul reddito",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Applied to a basic tariff: the tariff reads the income divided by it, and
    // its amount is multiplied back. 2 is full splitting of a couple's income.
    key: "tax.income.divisor",
    label: {
      en: "Income divisor (splitting)",
      de: "Divisor des Einkommens (Splitting)",
      fr: "diviseur du revenu (splitting)",
      it: "divisore del reddito (splitting)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // Vaud's cantonal and communal income tax together may not exceed this
    // share of taxable income (LICom art. 8).
    key: "tax.income.limit",
    label: {
      en: "Maximum share of income taken by cantonal and communal tax",
      de: "Höchstanteil des Einkommens für Staats- und Gemeindesteuer",
      fr: "part maximale du revenu pour les impôts cantonal et communal",
      it: "quota massima del reddito per le imposte cantonale e comunale",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0.05, max: 1 },
  },
  {
    // Vaud cuts its cantonal tax by a share the tax law sets each year (LRIPP
    // art. 4); the communes' tax is not cut.
    key: "tax.income.basic.reduction",
    label: {
      en: "Reduction of the cantonal income tax",
      de: "Reduktion der Staatssteuer auf dem Einkommen",
      fr: "réduction de l'impôt cantonal sur le revenu",
      it: "riduzione dell'imposta cantonale sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.5 },
  },
  {
    // The index by which a canton or a commune moves its income tariff to
    // higher incomes to offset inflation, each on its own schedule (Valais:
    // StG art. 32 para. 4 for the canton, art. 178 para. 5 for its communes).
    // The tariff is read at the income divided by it. Absent: 1.
    key: "tax.income.index",
    label: {
      en: "Income tariff index",
      de: "Indexierung des Einkommenstarifs",
      fr: "indexation du barème sur le revenu",
      it: "indicizzazione della tariffa sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // The share by which a couple's income tax is cut (Valais: 35 %, StG art.
    // 32 para. 3a and art. 178 para. 3a). Recorded for the couple only.
    key: "tax.income.rebate",
    label: {
      en: "Rebate on the income tax",
      de: "Ermässigung der Einkommenssteuer",
      fr: "rabais d'impôt sur le revenu",
      it: "riduzione dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.6 },
  },
  {
    key: "tax.income.rebate.least",
    label: {
      en: "Least rebate on the income tax",
      de: "Mindestermässigung der Einkommenssteuer",
      fr: "rabais minimal d'impôt sur le revenu",
      it: "riduzione minima dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 5_000 },
  },
  {
    key: "tax.income.rebate.most",
    label: {
      en: "Most rebate on the income tax",
      de: "Höchstermässigung der Einkommenssteuer",
      fr: "rabais maximal d'impôt sur le revenu",
      it: "riduzione massima dell'imposta sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 20_000 },
  },
  {
    // The least cantonal income tax a taxpayer owes (Valais: CHF 10, StG art.
    // 32 para. 6).
    key: "tax.income.floor",
    label: {
      en: "Minimum income tax",
      de: "Mindeststeuer auf dem Einkommen",
      fr: "impôt minimal sur le revenu",
      it: "imposta minima sul reddito",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 1_000 },
  },
  {
    // The yield the law assumes on wealth and taxes as income, on one tariff
    // with it (Liechtenstein's Sollertrag: SteG, LR 640.0, art. 5 and art. 14
    // para. 2 l; 4 % for 2025 by the Finanzgesetz, LGBl. 2024 Nr. 441, art. 2).
    key: "tax.wealth.yield",
    label: {
      en: "Assumed yield on wealth",
      de: "Sollertrag des Vermögens",
      fr: "rendement présumé de la fortune",
      it: "reddito presunto della sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 0.2 },
  },
  {
    key: "tax.multiplier",
    label: {
      en: "Tax multiplier",
      de: "Steuerfuss",
      fr: "coefficient d'impôt",
      it: "moltiplicatore d'imposta",
    },
    valueType: "number",
    unit: "ratio",
    // Swiss multipliers reach 5.25 (Lungern, on a small basic tariff); a percent
    // read as a fraction (119 for 1.19) still falls far outside.
    plausible: { min: 0, max: 6 },
  },
  {
    // The wealth tariff a canton's and its communes' multipliers apply to.
    key: "tax.wealth.tariff.basic",
    label: {
      en: "Basic wealth tax tariff",
      de: "Grundtarif Vermögenssteuer (einfache Steuer)",
      fr: "barème de base de l'impôt sur la fortune",
      it: "tariffa di base dell'imposta sulla sostanza",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The canton's or commune's multiplier on the basic wealth tax; the same as
    // on income in most places, not in all (Fribourg's communes).
    key: "tax.wealth.multiplier",
    label: {
      en: "Tax multiplier on wealth",
      de: "Steuerfuss auf dem Vermögen",
      fr: "coefficient d'impôt sur la fortune",
      it: "moltiplicatore d'imposta sulla sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // A commune's church tax rate for members of the Evangelical Reformed church, on the basic income tax.
    key: "tax.church.reformed",
    label: {
      en: "Church tax rate on income (Evangelical Reformed)",
      de: "Kirchensteuerfuss auf dem Einkommen (evangelisch-reformiert)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (réformée évangélique)",
      it: "moltiplicatore dell'imposta di culto sul reddito (evangelica riformata)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Evangelical Reformed church, on the basic wealth tax.
    key: "tax.church.wealth.reformed",
    label: {
      en: "Church tax rate on wealth (Evangelical Reformed)",
      de: "Kirchensteuerfuss auf dem Vermögen (evangelisch-reformiert)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (réformée évangélique)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (evangelica riformata)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Roman Catholic church, on the basic income tax.
    key: "tax.church.catholic",
    label: {
      en: "Church tax rate on income (Roman Catholic)",
      de: "Kirchensteuerfuss auf dem Einkommen (römisch-katholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (catholique romaine)",
      it: "moltiplicatore dell'imposta di culto sul reddito (cattolica romana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Roman Catholic church, on the basic wealth tax.
    key: "tax.church.wealth.catholic",
    label: {
      en: "Church tax rate on wealth (Roman Catholic)",
      de: "Kirchensteuerfuss auf dem Vermögen (römisch-katholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (catholique romaine)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (cattolica romana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Christian Catholic church, on the basic income tax.
    key: "tax.church.christ_catholic",
    label: {
      en: "Church tax rate on income (Christian Catholic)",
      de: "Kirchensteuerfuss auf dem Einkommen (christkatholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur le revenu (catholique-chrétienne)",
      it: "moltiplicatore dell'imposta di culto sul reddito (cattolica cristiana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // A commune's church tax rate for members of the Christian Catholic church, on the basic wealth tax.
    key: "tax.church.wealth.christ_catholic",
    label: {
      en: "Church tax rate on wealth (Christian Catholic)",
      de: "Kirchensteuerfuss auf dem Vermögen (christkatholisch)",
      fr: "coefficient de l'impôt ecclésiastique sur la fortune (catholique-chrétienne)",
      it: "moltiplicatore dell'imposta di culto sulla sostanza (cattolica cristiana)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
  },
  {
    // The tariff the Evangelical Reformed church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.reformed",
    label: {
      en: "Church tax base on income (Evangelical Reformed)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (evangelisch-reformiert)",
      fr: "base de l'impôt ecclésiastique sur le revenu (réformée évangélique)",
      it: "base dell'imposta di culto sul reddito (evangelica riformata)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Roman Catholic church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.catholic",
    label: {
      en: "Church tax base on income (Roman Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (römisch-katholisch)",
      fr: "base de l'impôt ecclésiastique sur le revenu (catholique romaine)",
      it: "base dell'imposta di culto sul reddito (cattolica romana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Christian Catholic church's rates on income apply to: the canton's basic
    // income tariff in most cantons, a share of income where the church's rate is one.
    key: "tax.church.tariff.christ_catholic",
    label: {
      en: "Church tax base on income (Christian Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Einkommen (christkatholisch)",
      fr: "base de l'impôt ecclésiastique sur le revenu (catholique-chrétienne)",
      it: "base dell'imposta di culto sul reddito (cattolica cristiana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Where church tax is levied on the cantonal tax rather than the basic tax,
    // the canton's multiplier on income, by which every church rate is scaled.
    key: "tax.church.scale",
    label: {
      en: "Church tax levied on the cantonal tax on income",
      de: "Kirchensteuer auf der Staatssteuer auf dem Einkommen",
      fr: "impôt ecclésiastique sur l'impôt cantonal sur le revenu",
      it: "imposta di culto sull'imposta cantonale sul reddito",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // The tariff the Evangelical Reformed church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.reformed",
    label: {
      en: "Church tax base on wealth (Evangelical Reformed)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (evangelisch-reformiert)",
      fr: "base de l'impôt ecclésiastique sur la fortune (réformée évangélique)",
      it: "base dell'imposta di culto sulla sostanza (evangelica riformata)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Roman Catholic church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.catholic",
    label: {
      en: "Church tax base on wealth (Roman Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (römisch-katholisch)",
      fr: "base de l'impôt ecclésiastique sur la fortune (catholique romaine)",
      it: "base dell'imposta di culto sulla sostanza (cattolica romana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // The tariff the Christian Catholic church's rates on wealth apply to: the canton's basic
    // wealth tariff in most cantons, a share of wealth where the church's rate is one.
    key: "tax.church.wealth.tariff.christ_catholic",
    label: {
      en: "Church tax base on wealth (Christian Catholic)",
      de: "Bemessung der Kirchensteuer auf dem Vermögen (christkatholisch)",
      fr: "base de l'impôt ecclésiastique sur la fortune (catholique-chrétienne)",
      it: "base dell'imposta di culto sulla sostanza (cattolica cristiana)",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Where church tax is levied on the cantonal tax rather than the basic tax,
    // the canton's multiplier on wealth, by which every church rate is scaled.
    key: "tax.church.wealth.scale",
    label: {
      en: "Church tax levied on the cantonal tax on wealth",
      de: "Kirchensteuer auf der Staatssteuer auf dem Vermögen",
      fr: "impôt ecclésiastique sur l'impôt cantonal sur la fortune",
      it: "imposta di culto sull'imposta cantonale sulla sostanza",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 6 },
  },
  {
    // Applied to the basic wealth tariff as tax.income.divisor is to income's.
    key: "tax.wealth.divisor",
    label: {
      en: "Wealth divisor (splitting)",
      de: "Divisor des Vermögens (Splitting)",
      fr: "diviseur de la fortune (splitting)",
      it: "divisore della sostanza (splitting)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 1, max: 3 },
  },
  {
    // A canton's fixed tax per head (Personalsteuer, taxe personnelle), for a
    // household of the variant: per person in some cantons, per household in
    // others. 0 where the canton levies none.
    key: "tax.head",
    label: {
      en: "Per-head tax",
      de: "Personalsteuer",
      fr: "taxe personnelle",
      it: "imposta personale",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // Added to the per-head tax for a member of a church that levies one.
    key: "tax.head.church",
    label: {
      en: "Per-head church tax",
      de: "Kirchliche Personalsteuer",
      fr: "taxe personnelle ecclésiastique",
      it: "imposta personale di culto",
    },
    valueType: "tariff",
    unit: "currency",
  },
  {
    // How many adults of the variant's household a commune's per-head tax counts.
    key: "tax.head.adults",
    label: {
      en: "Adults liable to the communal per-head tax",
      de: "Personen mit Gemeinde-Personalsteuer",
      fr: "adultes soumis à la taxe personnelle communale",
      it: "adulti soggetti all'imposta personale comunale",
    },
    valueType: "tariff",
    unit: "count",
  },
  {
    // A commune's own per-head tax, per adult, where the commune sets it (Solothurn's).
    key: "tax.head.communal",
    label: {
      en: "Communal per-head tax",
      de: "Gemeinde-Personalsteuer",
      fr: "taxe personnelle communale",
      it: "imposta personale comunale",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Evangelical Reformed church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.reformed",
    label: {
      en: "Parish per-head tax (Evangelical Reformed)",
      de: "Personalsteuer der Kirchgemeinde (evangelisch-reformiert)",
      fr: "taxe personnelle paroissiale (réformée évangélique)",
      it: "imposta personale parrocchiale (evangelica riformata)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Roman Catholic church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.catholic",
    label: {
      en: "Parish per-head tax (Roman Catholic)",
      de: "Personalsteuer der Kirchgemeinde (römisch-katholisch)",
      fr: "taxe personnelle paroissiale (catholique romaine)",
      it: "imposta personale parrocchiale (cattolica romana)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A parish's own per-head tax per adult member of the Christian Catholic church, where the
    // parish sets it (Solothurn's).
    key: "tax.head.church.communal.christ_catholic",
    label: {
      en: "Parish per-head tax (Christian Catholic)",
      de: "Personalsteuer der Kirchgemeinde (christkatholisch)",
      fr: "taxe personnelle paroissiale (catholique-chrétienne)",
      it: "imposta personale parrocchiale (cattolica cristiana)",
    },
    valueType: "number",
    unit: "currency",
    plausible: { min: 0, max: 500 },
  },
  {
    // A further cantonal multiplier on the basic income and wealth tax that no
    // reduction of the canton's own touches: Geneva's 1 centime for home care
    // (LCAC, rsGE D 3 07, art. 2 para. 2).
    key: "tax.multiplier.extra",
    label: {
      en: "Further cantonal multiplier",
      de: "Zusätzlicher kantonaler Steuerfuss",
      fr: "centime additionnel supplémentaire",
      it: "moltiplicatore cantonale supplementare",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
  },
  {
    // A supplementary wealth tax levied as it stands, on no multiplier: Geneva's
    // (LIPP, rsGE D 3 08, art. 59 para. 2). A flat 0 where a canton levies none.
    key: "tax.wealth.tariff.supplement",
    label: {
      en: "Supplementary wealth tax tariff",
      de: "Tarif der zusätzlichen Vermögenssteuer",
      fr: "barème de l'impôt supplémentaire sur la fortune",
      it: "tariffa dell'imposta supplementare sulla sostanza",
    },
    valueType: "tariff",
    unit: "currency",
  },
  // --- Statistics a reader can chart (/statistics). Read from the World
  // Bank's World Development Indicators (CC BY 4.0), one source per country
  // (sources.ts, "worldbank-wdi-*"). Codes and definitions checked against the
  // Indicators API on 2026-11-08.
  {
    key: "economy.government.consumption",
    label: {
      en: "Government consumption (share of GDP)",
      de: "Staatskonsum (Anteil am BIP)",
      fr: "Consommation des administrations publiques (part du PIB)",
      it: "Consumi della pubblica amministrazione (quota del PIL)",
      ru: "Государственное потребление (доля ВВП)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "General government final consumption expenditure, as a share of GDP: what all levels of government spend on goods and services, including the pay of their employees.",
        de: "Konsumausgaben des Staates als Anteil am BIP: was alle Staatsebenen für Güter und Dienstleistungen ausgeben, einschliesslich der Löhne ihres Personals.",
        fr: "Dépenses de consommation finale des administrations publiques, en part du PIB : ce que tous les niveaux de l'État dépensent en biens et services, salaires de leur personnel compris.",
        it: "Spesa per consumi finali delle amministrazioni pubbliche, in quota del PIL: quanto spendono tutti i livelli dello Stato in beni e servizi, compresi i salari del personale.",
        ru: "Расходы органов государственного управления на конечное потребление в доле ВВП: траты всех уровней власти на товары и услуги, включая оплату труда их сотрудников.",
      },
      series: {
        publisher: "World Bank, World Development Indicators",
        code: "NE.CON.GOVT.ZS",
        url: "https://data.worldbank.org/indicator/NE.CON.GOVT.ZS",
      },
    },
  },
  {
    key: "economy.government.expense",
    label: {
      en: "Government expense (share of GDP)",
      de: "Staatsausgaben (Anteil am BIP)",
      fr: "Charges des administrations publiques (part du PIB)",
      it: "Spese della pubblica amministrazione (quota del PIL)",
      ru: "Государственные расходы (доля ВВП)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "Expense of the government as a share of GDP: cash payments for its operating activities in providing goods and services, as the IMF's Government Finance Statistics count them.",
        de: "Aufwand des Staates als Anteil am BIP: Zahlungen für seine laufende Tätigkeit bei der Bereitstellung von Gütern und Dienstleistungen, wie sie die Government Finance Statistics des IWF zählen.",
        fr: "Charges de l'État en part du PIB : paiements pour ses activités courantes de fourniture de biens et de services, tels que les comptent les Government Finance Statistics du FMI.",
        it: "Spese dello Stato in quota del PIL: pagamenti per la sua attività corrente di fornitura di beni e servizi, come li contano le Government Finance Statistics del FMI.",
        ru: "Расходы государства в доле ВВП: платежи на текущую деятельность по предоставлению товаров и услуг, как их учитывает статистика государственных финансов МВФ.",
      },
      series: {
        publisher: "World Bank, World Development Indicators",
        code: "GC.XPN.TOTL.GD.ZS",
        url: "https://data.worldbank.org/indicator/GC.XPN.TOTL.GD.ZS",
      },
    },
  },
  {
    key: "tax.revenue.total",
    label: {
      en: "Tax revenue (share of GDP)",
      de: "Steuereinnahmen (Anteil am BIP)",
      fr: "Recettes fiscales (part du PIB)",
      it: "Entrate fiscali (quota del PIL)",
      ru: "Налоговые поступления (доля ВВП)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "Tax revenue of the central government as a share of GDP: compulsory transfers for public purposes, as the IMF's Government Finance Statistics count them. Social contributions are not included.",
        de: "Steuereinnahmen des Zentralstaats als Anteil am BIP: obligatorische Abgaben für öffentliche Zwecke, wie sie die Government Finance Statistics des IWF zählen. Sozialbeiträge sind nicht enthalten.",
        fr: "Recettes fiscales de l'administration centrale en part du PIB : transferts obligatoires à des fins publiques, tels que les comptent les Government Finance Statistics du FMI. Les cotisations sociales n'y sont pas comprises.",
        it: "Entrate fiscali dell'amministrazione centrale in quota del PIL: trasferimenti obbligatori per fini pubblici, come li contano le Government Finance Statistics del FMI. I contributi sociali non sono compresi.",
        ru: "Налоговые поступления центрального правительства в доле ВВП: обязательные платежи на общественные цели, как их учитывает статистика государственных финансов МВФ. Социальные взносы не включены.",
      },
      series: {
        publisher: "World Bank, World Development Indicators",
        code: "GC.TAX.TOTL.GD.ZS",
        url: "https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS",
      },
    },
  },
  {
    key: "crime.homicide.rate",
    label: {
      en: "Intentional homicides (per 100,000 people)",
      de: "Vorsätzliche Tötungsdelikte (pro 100 000 Einwohner)",
      fr: "Homicides volontaires (pour 100 000 habitants)",
      it: "Omicidi volontari (ogni 100 000 abitanti)",
      ru: "Умышленные убийства (на 100 000 человек)",
    },
    valueType: "number",
    unit: "per_100k",
    plausible: { min: 0, max: 200 },
    statistic: {
      definition: {
        en: "Unlawful deaths inflicted on a person with the intent to cause death or serious injury, per 100,000 people, as the UN Office on Drugs and Crime collects them from national police and health records.",
        de: "Widerrechtliche Tötungen mit dem Vorsatz, den Tod oder eine schwere Verletzung herbeizuführen, pro 100 000 Einwohner, wie sie das UNO-Büro für Drogen- und Verbrechensbekämpfung aus nationalen Polizei- und Gesundheitsdaten erhebt.",
        fr: "Décès illicites infligés avec l'intention de causer la mort ou des blessures graves, pour 100 000 habitants, tels que l'Office des Nations unies contre la drogue et le crime les recueille auprès des polices et des services de santé nationaux.",
        it: "Morti illecite inflitte con l'intento di causare la morte o lesioni gravi, ogni 100 000 abitanti, come l'Ufficio delle Nazioni Unite contro la droga e il crimine le raccoglie dai dati nazionali di polizia e sanità.",
        ru: "Незаконное причинение смерти с намерением убить или причинить тяжкий вред, на 100 000 человек, по данным, которые Управление ООН по наркотикам и преступности собирает у национальной полиции и органов здравоохранения.",
      },
      series: {
        publisher: "World Bank, World Development Indicators (from UNODC)",
        code: "VC.IHR.PSRC.P5",
        url: "https://data.worldbank.org/indicator/VC.IHR.PSRC.P5",
      },
    },
  },
  {
    key: "tax.income.top_rate",
    label: {
      en: "Top statutory income tax rate",
      de: "Höchster gesetzlicher Einkommenssteuersatz",
      fr: "Taux légal maximal de l'impôt sur le revenu",
      it: "Aliquota legale massima dell'imposta sul reddito",
      ru: "Максимальная установленная ставка подоходного налога",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "The highest statutory rate of personal income tax on earnings, sub-central taxes included, as the OECD Tax Database computes it. Its notes say how each country's sub-central rate is chosen where places differ.",
        de: "Der höchste gesetzliche Satz der Einkommenssteuer natürlicher Personen auf Erwerbseinkommen, einschliesslich der Steuern unterer Ebenen, wie ihn die Steuerdatenbank der OECD berechnet. Ihre Anmerkungen sagen, welcher Satz einer unteren Ebene gewählt wird, wo sich Orte unterscheiden.",
        fr: "Le taux légal le plus élevé de l'impôt sur le revenu des personnes physiques sur les revenus du travail, impôts infranationaux compris, tel que le calcule la base de données fiscales de l'OCDE. Ses notes indiquent quel taux infranational est retenu là où les lieux diffèrent.",
        it: "L'aliquota legale più alta dell'imposta sul reddito delle persone fisiche sui redditi da lavoro, imposte subnazionali comprese, come la calcola la banca dati fiscale dell'OCSE. Le sue note dicono quale aliquota subnazionale è scelta dove i luoghi differiscono.",
        ru: "Наивысшая установленная законом ставка подоходного налога с физических лиц на трудовые доходы, включая налоги нижестоящих уровней, как её рассчитывает налоговая база данных ОЭСР. В её примечаниях сказано, какая ставка нижестоящего уровня выбрана там, где места различаются.",
      },
      series: {
        publisher: "OECD Tax Database",
        code: "OECD.CTP.TPS,DSD_TAX_PIT@DF_PIT_TOP_EARN_THRESH,1.0",
        measure: "TS_PIT",
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_TAX_PIT%40DF_PIT_TOP_EARN_THRESH&df[ag]=OECD.CTP.TPS",
      },
    },
  },
];
