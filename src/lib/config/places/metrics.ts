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
      scope: {
        en: "General government: every level together, so a federal country's states and communes count.",
        de: "Der Staat insgesamt: alle Ebenen zusammen; Gliedstaaten und Gemeinden eines Bundesstaats zählen mit.",
        fr: "L'ensemble des administrations publiques : tous niveaux confondus, les États fédérés et les communes d'un pays fédéral y comptent.",
        it: "L'insieme delle amministrazioni pubbliche: tutti i livelli insieme; gli stati federati e i comuni di un paese federale vi rientrano.",
        ru: "Государственный сектор в целом: все уровни вместе, штаты и общины федеративной страны учитываются.",
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
    retired: true,
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
    retired: true,
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
        en: "Intentional homicides per 100,000 people, as the UN Office on Drugs and Crime publishes them and the World Bank passes them on. Each country's own definitions and recording practices apply, so levels are best compared with care.",
        de: "Vorsätzliche Tötungsdelikte pro 100 000 Einwohner, wie sie das UNO-Büro für Drogen- und Verbrechensbekämpfung veröffentlicht und die Weltbank weitergibt. Es gelten die Definitionen und Erfassungsregeln des jeweiligen Landes; Niveaus sind deshalb mit Vorsicht zu vergleichen.",
        fr: "Homicides volontaires pour 100 000 habitants, tels que l'Office des Nations unies contre la drogue et le crime les publie et que la Banque mondiale les relaie. Les définitions et les règles d'enregistrement de chaque pays s'appliquent ; les niveaux se comparent donc avec prudence.",
        it: "Omicidi volontari ogni 100 000 abitanti, come l'Ufficio delle Nazioni Unite contro la droga e il crimine li pubblica e la Banca mondiale li riprende. Valgono le definizioni e le regole di registrazione di ogni paese; i livelli vanno quindi confrontati con cautela.",
        ru: "Умышленные убийства на 100 000 человек в том виде, в каком их публикует Управление ООН по наркотикам и преступности и передаёт Всемирный банк. Действуют определения и правила учёта каждой страны, поэтому уровни стоит сравнивать осторожно.",
      },
      scope: {
        en: "The whole country. A national rate says nothing about a single city or about which deaths a law touched.",
        de: "Das ganze Land. Eine Landesrate sagt nichts über eine einzelne Stadt oder darüber, welche Todesfälle ein Gesetz betraf.",
        fr: "Le pays entier. Un taux national ne dit rien d'une ville en particulier ni des décès qu'une loi a touchés.",
        it: "L'intero paese. Un tasso nazionale non dice nulla su una singola città né su quali decessi una legge abbia toccato.",
        ru: "Вся страна. Общенациональный показатель ничего не говорит об отдельном городе и о том, каких смертей коснулся закон.",
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
        en: "The top statutory personal income tax rate, in per cent of gross wage earnings, as the OECD Tax Database states it for general government, all levels together.",
        de: "Der höchste gesetzliche Satz der Einkommenssteuer natürlicher Personen, in Prozent des Bruttolohns, wie ihn die Steuerdatenbank der OECD für den Staat insgesamt, alle Ebenen zusammen, angibt.",
        fr: "Le taux légal maximal de l'impôt sur le revenu des personnes physiques, en pourcentage du salaire brut, tel que la base de données fiscales de l'OCDE l'indique pour l'ensemble des administrations publiques, tous niveaux confondus.",
        it: "L'aliquota legale massima dell'imposta sul reddito delle persone fisiche, in percentuale del salario lordo, come la banca dati fiscale dell'OCSE la indica per l'insieme delle amministrazioni pubbliche, tutti i livelli insieme.",
        ru: "Наивысшая установленная законом ставка подоходного налога с физических лиц в процентах от валовой заработной платы, как её указывает налоговая база данных ОЭСР для государственного сектора в целом, всех уровней вместе.",
      },
      scope: {
        en: "All levels of government together, so a country's own states, cantons or communes count towards it.",
        de: "Alle Staatsebenen zusammen; Gliedstaaten, Kantone und Gemeinden eines Landes zählen mit.",
        fr: "Tous les niveaux de l'État ensemble ; les États fédérés, cantons et communes d'un pays y comptent.",
        it: "Tutti i livelli dello Stato insieme; stati federati, cantoni e comuni di un paese vi rientrano.",
        ru: "Все уровни власти вместе: штаты, кантоны и общины страны учитываются.",
      },
      fixedByLaw: true,
      series: {
        publisher: "OECD Tax Database",
        code: "OECD.CTP.TPS,DSD_TAX_PIT@DF_PIT_TOP_EARN_THRESH,1.0",
        measure: "TS_PIT",
        key: "{iso3}.A..TS_PIT........",
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_TAX_PIT%40DF_PIT_TOP_EARN_THRESH&df[ag]=OECD.CTP.TPS",
      },
    },
  },
  {
    key: "economy.government.expenditure",
    label: {
      en: "Government expenditure (share of GDP)",
      de: "Staatsausgaben (Anteil am BIP)",
      fr: "Dépenses des administrations publiques (part du PIB)",
      it: "Spesa delle amministrazioni pubbliche (quota del PIL)",
      ru: "Расходы государства (доля ВВП)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 2 },
    statistic: {
      definition: {
        en: "Total expenditure of general government, in per cent of GDP, as the OECD's Government at a Glance public finance indicators state it.",
        de: "Gesamtausgaben des Staates in Prozent des BIP, wie sie die Indikatoren zu den öffentlichen Finanzen im OECD-Bericht «Government at a Glance» angeben.",
        fr: "Dépenses totales de l'ensemble des administrations publiques, en pourcentage du PIB, telles que les indicateurs de finances publiques de « Panorama des administrations publiques » de l'OCDE les indiquent.",
        it: "Spesa totale dell'insieme delle amministrazioni pubbliche, in percentuale del PIL, come la indicano gli indicatori di finanza pubblica di «Government at a Glance» dell'OCSE.",
        ru: "Общие расходы государственного сектора в процентах ВВП, как их указывают показатели государственных финансов ОЭСР «Government at a Glance».",
      },
      scope: {
        en: "General government: every level together, social security funds included.",
        de: "Der Staat insgesamt: alle Ebenen zusammen, Sozialversicherungen eingeschlossen.",
        fr: "L'ensemble des administrations publiques : tous niveaux confondus, sécurité sociale comprise.",
        it: "L'insieme delle amministrazioni pubbliche: tutti i livelli insieme, previdenza sociale inclusa.",
        ru: "Государственный сектор в целом: все уровни вместе, включая фонды социального страхования.",
      },
      series: {
        publisher: "OECD, Government at a Glance",
        code: "OECD.GOV.GIP,DSD_GOV@DF_GOV_PF_2025,1.0",
        measure: "GE",
        key: "A.{iso3}.GE.PT_B1GQ.S13..",
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_GOV%40DF_GOV_PF_2025&df[ag]=OECD.GOV.GIP",
      },
    },
  },
  {
    key: "tax.revenue.general",
    label: {
      en: "Tax revenue, all levels (share of GDP)",
      de: "Steuereinnahmen, alle Ebenen (Anteil am BIP)",
      fr: "Recettes fiscales, tous niveaux (part du PIB)",
      it: "Entrate fiscali, tutti i livelli (quota del PIL)",
      ru: "Налоговые поступления, все уровни (доля ВВП)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "Total tax revenue of general government, in per cent of GDP, as the OECD's Revenue Statistics state it. Social security contributions count as taxes in this series.",
        de: "Gesamte Steuereinnahmen des Staates in Prozent des BIP, wie sie die OECD-«Revenue Statistics» angeben. Sozialversicherungsbeiträge zählen in dieser Reihe als Steuern.",
        fr: "Recettes fiscales totales de l'ensemble des administrations publiques, en pourcentage du PIB, telles que les « Statistiques des recettes publiques » de l'OCDE les indiquent. Les cotisations de sécurité sociale comptent comme impôts dans cette série.",
        it: "Entrate fiscali totali dell'insieme delle amministrazioni pubbliche, in percentuale del PIL, come le indicano le «Revenue Statistics» dell'OCSE. In questa serie i contributi previdenziali contano come imposte.",
        ru: "Общие налоговые поступления государственного сектора в процентах ВВП, как их указывает статистика доходов ОЭСР «Revenue Statistics». Взносы на социальное страхование в этом ряду считаются налогами.",
      },
      scope: {
        en: "General government: every level together, so a federal country's states and communes count.",
        de: "Der Staat insgesamt: alle Ebenen zusammen; Gliedstaaten und Gemeinden eines Bundesstaats zählen mit.",
        fr: "L'ensemble des administrations publiques : tous niveaux confondus, les États fédérés et les communes d'un pays fédéral y comptent.",
        it: "L'insieme delle amministrazioni pubbliche: tutti i livelli insieme; gli stati federati e i comuni di un paese federale vi rientrano.",
        ru: "Государственный сектор в целом: все уровни вместе, штаты и общины федеративной страны учитываются.",
      },
      series: {
        publisher: "OECD, Revenue Statistics",
        code: "OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,2.0",
        measure: "TAX_REV",
        key: "{iso3}.TAX_REV.S13._T..PT_B1GQ.A",
        match: { SECTOR: "S13", UNIT_MEASURE: "PT_B1GQ" },
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_REV_COMP_OECD%40DF_RSOECD&df[ag]=OECD.CTP.TPS",
      },
    },
  },
  {
    key: "tax.revenue.central_share",
    label: {
      en: "Central government's share of all tax revenue",
      de: "Anteil des Zentralstaats an allen Steuereinnahmen",
      fr: "Part de l'administration centrale dans l'ensemble des recettes fiscales",
      it: "Quota dell'amministrazione centrale su tutte le entrate fiscali",
      ru: "Доля центрального правительства во всех налоговых поступлениях",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: 0, max: 1 },
    statistic: {
      definition: {
        en: "The share of all tax revenue that central government collects, as the OECD's Revenue Statistics state it. The rest is collected by states or cantons, by communes, by social security funds and, in the European Union, by its institutions. A higher share means tax is collected more centrally.",
        de: "Der Anteil der gesamten Steuereinnahmen, den der Zentralstaat einnimmt, wie ihn die OECD-«Revenue Statistics» angeben. Den Rest nehmen Gliedstaaten oder Kantone, Gemeinden, Sozialversicherungen und in der Europäischen Union deren Institutionen ein. Ein höherer Anteil heisst: Steuern werden zentraler erhoben.",
        fr: "La part de l'ensemble des recettes fiscales que perçoit l'administration centrale, telle que les « Statistiques des recettes publiques » de l'OCDE l'indiquent. Le reste est perçu par les États fédérés ou les cantons, les communes, les administrations de sécurité sociale et, dans l'Union européenne, ses institutions. Une part plus élevée signifie un prélèvement plus centralisé.",
        it: "La quota di tutte le entrate fiscali riscossa dall'amministrazione centrale, come la indicano le «Revenue Statistics» dell'OCSE. Il resto è riscosso da stati federati o cantoni, comuni, enti di previdenza sociale e, nell'Unione europea, dalle sue istituzioni. Una quota più alta significa una riscossione più centralizzata.",
        ru: "Доля всех налоговых поступлений, которую собирает центральное правительство, по данным статистики доходов ОЭСР «Revenue Statistics». Остальное собирают штаты или кантоны, общины, фонды социального страхования и, в Европейском союзе, его институты. Чем выше доля, тем централизованнее сбор налогов.",
      },
      scope: {
        en: "Where tax is collected, not where it is spent. Social security funds are counted apart from central government.",
        de: "Wo Steuern erhoben werden, nicht wo sie ausgegeben werden. Sozialversicherungen werden getrennt vom Zentralstaat gezählt.",
        fr: "Où l'impôt est perçu, pas où il est dépensé. Les administrations de sécurité sociale sont comptées à part de l'administration centrale.",
        it: "Dove le imposte sono riscosse, non dove sono spese. Gli enti di previdenza sociale sono contati a parte rispetto all'amministrazione centrale.",
        ru: "Где налоги собираются, а не где тратятся. Фонды социального страхования учитываются отдельно от центрального правительства.",
      },
      series: {
        publisher: "OECD, Revenue Statistics",
        code: "OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,2.0",
        measure: "TAX_REV",
        key: "{iso3}.TAX_REV.S1311._T..PT_OTR_REV_CAT.A",
        match: { SECTOR: "S1311", UNIT_MEASURE: "PT_OTR_REV_CAT" },
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_REV_COMP_OECD%40DF_RSOECD&df[ag]=OECD.CTP.TPS",
      },
    },
  },
  {
    key: "tax.wedge.average",
    label: {
      en: "Average tax wedge on labour (share of labour cost)",
      de: "Durchschnittliche Steuer- und Abgabenbelastung der Arbeit (Anteil an den Arbeitskosten)",
      fr: "Coin fiscal moyen sur le travail (part du coût du travail)",
      it: "Cuneo fiscale medio sul lavoro (quota del costo del lavoro)",
      ru: "Средний налоговый клин на труд (доля затрат на труд)",
    },
    valueType: "number",
    unit: "ratio",
    plausible: { min: -0.2, max: 0.8 },
    statistic: {
      definition: {
        en: "Income tax plus employees' and employers' social security contributions, less cash benefits, as a share of total labour cost, for a single person without children earning the average wage, as the OECD's Taxing Wages states it.",
        de: "Einkommenssteuer plus Sozialversicherungsbeiträge von Arbeitnehmern und Arbeitgebern, abzüglich Geldleistungen, als Anteil an den gesamten Arbeitskosten, für eine alleinstehende Person ohne Kinder mit Durchschnittslohn, wie es die OECD-«Taxing Wages» angeben.",
        fr: "Impôt sur le revenu plus cotisations sociales des salariés et des employeurs, moins les prestations en espèces, en part du coût total du travail, pour une personne seule sans enfant gagnant le salaire moyen, tel que « Les impôts sur les salaires » de l'OCDE l'indiquent.",
        it: "Imposta sul reddito più contributi sociali di lavoratori e datori di lavoro, meno le prestazioni in denaro, in quota del costo totale del lavoro, per una persona sola senza figli con il salario medio, come lo indica «Taxing Wages» dell'OCSE.",
        ru: "Подоходный налог плюс взносы на социальное страхование работников и работодателей за вычетом денежных пособий, в доле общих затрат на труд, для одинокого человека без детей со средней зарплатой, по данным «Taxing Wages» ОЭСР.",
      },
      scope: {
        en: "One household type only: a single person without children on the average wage. It is what the rules take from a typical pay packet, not the average of what everyone pays.",
        de: "Nur ein Haushaltstyp: eine alleinstehende Person ohne Kinder mit Durchschnittslohn. Es ist, was die Regeln einem typischen Lohn entnehmen, nicht der Durchschnitt dessen, was alle zahlen.",
        fr: "Un seul type de ménage : une personne seule sans enfant au salaire moyen. C'est ce que les règles prélèvent sur une fiche de paie typique, non la moyenne de ce que tous paient.",
        it: "Un solo tipo di nucleo: una persona sola senza figli con il salario medio. È ciò che le regole prelevano da una busta paga tipica, non la media di ciò che tutti pagano.",
        ru: "Только один тип домохозяйства: одинокий человек без детей со средней зарплатой. Это то, что правила берут с типичной зарплаты, а не среднее по всем.",
      },
      series: {
        publisher: "OECD, Taxing Wages",
        code: "OECD.CTP.TPS,DSD_TAX_WAGES_COMP@DF_TW_COMP,2.1",
        measure: "AV_TW",
        key: "{iso3}.AV_TW.PT_COS_LB.S_C0.AW100._Z.A",
        match: { HOUSEHOLD_TYPE: "S_C0", INCOME_PRINCIPAL: "AW100" },
        url: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_TAX_WAGES_COMP%40DF_TW_COMP&df[ag]=OECD.CTP.TPS",
      },
    },
  },
  {
    key: "governance.wgi.voice",
    label: {
      en: "Voice and Accountability (World Bank score, 0–100)",
      de: "Mitsprache und Rechenschaft (Weltbank-Wert, 0–100)",
      fr: "Participation et redevabilité (note de la Banque mondiale, 0–100)",
      it: "Voce e responsabilità (punteggio della Banca mondiale, 0–100)",
      ru: "Право голоса и подотчётность (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Voice and Accountability, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Mitsprache und Rechenschaft, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "Participation et redevabilité, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Voce e responsabilità, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Право голоса и подотчётность — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_VA.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
  {
    key: "governance.wgi.stability",
    label: {
      en: "Political Stability (World Bank score, 0–100)",
      de: "Politische Stabilität (Weltbank-Wert, 0–100)",
      fr: "Stabilité politique (note de la Banque mondiale, 0–100)",
      it: "Stabilità politica (punteggio della Banca mondiale, 0–100)",
      ru: "Политическая стабильность (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Political Stability, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Politische Stabilität, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "Stabilité politique, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Stabilità politica, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Политическая стабильность — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_PV.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
  {
    key: "governance.wgi.effectiveness",
    label: {
      en: "Government Effectiveness (World Bank score, 0–100)",
      de: "Effektivität der Regierung (Weltbank-Wert, 0–100)",
      fr: "Efficacité de l'État (note de la Banque mondiale, 0–100)",
      it: "Efficacia del governo (punteggio della Banca mondiale, 0–100)",
      ru: "Эффективность правительства (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Government Effectiveness, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Effektivität der Regierung, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "Efficacité de l'État, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Efficacia del governo, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Эффективность правительства — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_GE.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
  {
    key: "governance.wgi.regulation",
    label: {
      en: "Regulatory Quality (World Bank score, 0–100)",
      de: "Regulierungsqualität (Weltbank-Wert, 0–100)",
      fr: "Qualité de la réglementation (note de la Banque mondiale, 0–100)",
      it: "Qualità della regolamentazione (punteggio della Banca mondiale, 0–100)",
      ru: "Качество регулирования (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Regulatory Quality, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Regulierungsqualität, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "Qualité de la réglementation, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Qualità della regolamentazione, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Качество регулирования — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_RQ.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
  {
    key: "governance.wgi.rule_of_law",
    label: {
      en: "Rule of Law (World Bank score, 0–100)",
      de: "Rechtsstaatlichkeit (Weltbank-Wert, 0–100)",
      fr: "État de droit (note de la Banque mondiale, 0–100)",
      it: "Stato di diritto (punteggio della Banca mondiale, 0–100)",
      ru: "Верховенство закона (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Rule of Law, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Rechtsstaatlichkeit, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "État de droit, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Stato di diritto, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Верховенство закона — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_RL.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
  {
    key: "governance.wgi.corruption",
    label: {
      en: "Control of Corruption (World Bank score, 0–100)",
      de: "Korruptionskontrolle (Weltbank-Wert, 0–100)",
      fr: "Maîtrise de la corruption (note de la Banque mondiale, 0–100)",
      it: "Controllo della corruzione (punteggio della Banca mondiale, 0–100)",
      ru: "Контроль коррупции (оценка Всемирного банка, 0–100)",
    },
    valueType: "number",
    unit: "none",
    plausible: { min: 0, max: 100 },
    statistic: {
      definition: {
        en: "Control of Corruption, one of the six Worldwide Governance Indicators, as a score from 0 to 100 (higher is a better standing among the countries covered). It is a composite of perceptions drawn from 35 cross-country sources (household surveys, firm surveys and expert assessments), not a count of anything, and the World Bank treats it as an estimate rather than a definitive rating.",
        de: "Korruptionskontrolle, einer der sechs Worldwide Governance Indicators, als Wert von 0 bis 100 (höher heisst eine bessere Stellung unter den erfassten Ländern). Ein Verbund von Wahrnehmungen aus 35 länderübergreifenden Quellen (Haushalts- und Unternehmensumfragen und Expertenbeurteilungen), keine Zählung; die Weltbank versteht ihn als Schätzung, nicht als endgültige Bewertung.",
        fr: "Maîtrise de la corruption, l'un des six Worldwide Governance Indicators, en note de 0 à 100 (plus élevée, meilleure position parmi les pays couverts). Un composite de perceptions tirées de 35 sources internationales (enquêtes auprès des ménages et des entreprises, évaluations d'experts), pas un dénombrement ; la Banque mondiale le considère comme une estimation, non comme une note définitive.",
        it: "Controllo della corruzione, uno dei sei Worldwide Governance Indicators, come punteggio da 0 a 100 (più alto, posizione migliore tra i paesi coperti). Un composito di percezioni tratte da 35 fonti internazionali (indagini presso famiglie e imprese, valutazioni di esperti), non un conteggio; la Banca mondiale lo considera una stima, non una valutazione definitiva.",
        ru: "Контроль коррупции — один из шести Worldwide Governance Indicators, оценка от 0 до 100 (выше — лучше положение среди охваченных стран). Сводка восприятий из 35 международных источников (опросы домохозяйств и компаний, экспертные оценки), а не подсчёт; Всемирный банк считает её оценкой, а не окончательным рейтингом.",
      },
      scope: {
        en: "The whole country. Scores move with the sources behind them and public perceptions can lag behind reforms; the World Bank intends them for research, policy analysis and reflection, not for credit or investment decisions.",
        de: "Das ganze Land. Die Werte folgen den zugrunde liegenden Quellen, und die Wahrnehmung kann Reformen hinterherhinken; die Weltbank sieht sie für Forschung, Politikanalyse und Reflexion vor, nicht für Kredit- oder Anlageentscheide.",
        fr: "Le pays entier. Les notes suivent les sources sous-jacentes et la perception peut retarder sur les réformes ; la Banque mondiale les destine à la recherche, à l'analyse des politiques et à la réflexion, pas aux décisions de crédit ou d'investissement.",
        it: "L'intero paese. I punteggi seguono le fonti sottostanti e la percezione può restare indietro rispetto alle riforme; la Banca mondiale li destina a ricerca, analisi delle politiche e riflessione, non a decisioni di credito o investimento.",
        ru: "Вся страна. Оценки зависят от исходных источников, а восприятие может отставать от реформ; Всемирный банк предназначает их для исследований, анализа политики и размышлений, а не для кредитных и инвестиционных решений.",
      },
      series: {
        publisher: "World Bank, Worldwide Governance Indicators",
        code: "GOV_WGI_CC.SC",
        url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators",
      },
    },
  },
];
