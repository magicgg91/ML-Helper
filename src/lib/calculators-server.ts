import { prisma } from "./prisma";
import {
  calculatorCatalog,
  defaultCalculatorAvailability,
  type CalculatorAvailability,
} from "./calculator-catalog";

export async function getCalculatorAvailability(): Promise<CalculatorAvailability> {
  const rows = await prisma.calculator.findMany({
    where: { slug: { in: calculatorCatalog.map(({ slug }) => slug) } },
    select: { slug: true, active: true },
  });
  const availability = { ...defaultCalculatorAvailability };
  for (const row of rows) {
    if (row.slug in availability)
      availability[row.slug as keyof CalculatorAvailability] = row.active;
  }
  return availability;
}
