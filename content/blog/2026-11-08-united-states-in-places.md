---
title: The United States in Places, starting with Wyoming
summary: Solon now holds the United States as places, its states and Wyoming's counties, with the 2026 federal income tax from the IRS's own figures and Wyoming's rate of zero.
author: The Solon team
tags: [places, tax, building in public]
---

Solon has held Wyoming's statutes and Constitution for a while. Until today it did not know where Wyoming is: there was no United States in Places, so the atlas could show Wyoming's law but not its counties, and there was no page for Laramie County to tell you what you would pay in tax there.

Now the United States is a country in Places, like Switzerland, Liechtenstein and Estonia.

## A skeleton first

The pack holds three levels: the nation, the states, and the counties. Every state and the District of Columbia is there, by its FIPS code from the Census Bureau, and so is each state's ISO code, so a question asked on a Wyoming county's page is asked of Wyoming's law. Of the counties, Wyoming's 23 are loaded, with their outlines from the Census Bureau's boundary file, so opening the United States on the atlas draws them.

Every other state's counties are the same kind of data. Adding them does not change the code: a script reads the Bureau's county list for the state and writes the file Solon imports.

## The tax, and what it leaves out

The federal income tax for 2026 comes from Rev. Proc. 2025-32, the IRS's revenue procedure that sets each year's brackets and standard deduction. Solon takes the rate tables for a single person and for a married couple filing jointly, and the standard deduction for each: 16,100 and 32,200 dollars. You enter your adjusted gross income, the figure on line 11 of Form 1040, and Solon takes off the standard deduction and applies the table. At 50,000 dollars, a single person's federal tax is 3,820 dollars.

Wyoming levies no income tax of its own. Its statutes keep the field to the state (W.S. 39-12-101), and the state levies none, so no county or town levies one either. Solon records that as a rate of zero rather than leaving it blank. The difference matters: a state whose income tax is not in Solon yet shows an incomplete estimate, never a zero it has not checked.

What the estimate does not include is listed beside it, in every language: Social Security and Medicare, tax credits such as the child tax credit, itemized deductions, the extra deductions added in 2025, capital gains rates, and the other filing statuses. It is the income tax on the figure you enter, no more.

## What is next

Each state's own income tax, beside the federal one, and every state's counties. The structure is ready for both; what each one needs is its source, read and cited.
