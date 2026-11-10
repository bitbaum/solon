/** The scopes budgets are held for (src/lib/budgets/scopes.ts). */
import type { BudgetScope } from "@/lib/budgets/scopes";

export const GENERAL_GOVERNMENT: BudgetScope = {
  key: "gg",
  label: {
    en: "General government",
    de: "Staat insgesamt",
    fr: "Administrations publiques",
    it: "Amministrazioni pubbliche",
    ru: "Государственный сектор в целом",
  },
  definition: {
    en: "General government: central, state and local government and social security funds together, consolidated so that money passed between them is counted once, as Eurostat's government finance statistics (ESA 2010) count it.",
    de: "Der Staat insgesamt: Bund, Länder oder Kantone, Gemeinden und Sozialversicherungen zusammen, konsolidiert, so dass Geld, das zwischen ihnen fliesst, einmal zählt, wie Eurostats Statistik der Staatsfinanzen (ESVG 2010) ihn zählt.",
    fr: "L'ensemble des administrations publiques : administration centrale, États fédérés ou cantons, collectivités locales et sécurité sociale, consolidés pour que l'argent qui circule entre elles ne compte qu'une fois, tels que les statistiques de finances publiques d'Eurostat (SEC 2010) les comptent.",
    it: "L'insieme delle amministrazioni pubbliche: amministrazione centrale, regioni o cantoni, enti locali e previdenza sociale insieme, consolidati in modo che il denaro che passa tra loro sia contato una volta, come lo contano le statistiche di finanza pubblica di Eurostat (SEC 2010).",
    ru: "Государственный сектор в целом: центральное правительство, региональные и местные органы власти и фонды социального страхования вместе, консолидированно, чтобы деньги, переходящие между ними, учитывались один раз, как их считает статистика государственных финансов Евростата (ЕСС 2010).",
  },
};

export const STATE_BUDGET: BudgetScope = {
  key: "state",
  label: {
    en: "State budget",
    de: "Staatshaushalt",
    fr: "Budget de l'État",
    it: "Bilancio dello Stato",
    ru: "Государственный бюджет",
  },
  definition: {
    en: "The budget the legislature adopts for the central government, as its own budget law states it. Funds kept apart from it (a social fund, local budgets) are not included.",
    de: "Der Haushalt, den das Parlament für die zentrale Regierung beschliesst, wie das Haushaltsgesetz selbst ihn angibt. Davon getrennt geführte Fonds (ein Sozialfonds, Gemeindehaushalte) sind nicht enthalten.",
    fr: "Le budget que le parlement adopte pour l'administration centrale, tel que sa propre loi de finances l'indique. Les fonds tenus à part (un fonds social, les budgets locaux) n'y sont pas compris.",
    it: "Il bilancio che il parlamento approva per l'amministrazione centrale, come lo indica la sua legge di bilancio. I fondi tenuti a parte (un fondo sociale, i bilanci locali) non sono inclusi.",
    ru: "Бюджет, который парламент принимает для центрального правительства, как его указывает сам закон о бюджете. Отдельно ведущиеся фонды (социальный фонд, местные бюджеты) не включены.",
  },
};

export const BUDGET_SCOPES: readonly BudgetScope[] = [GENERAL_GOVERNMENT, STATE_BUDGET];
