import { Recipe } from "../types";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

const sanitizeFileName = (title: string, ext: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);
  return `${slug || "chefai-recipe"}.${ext}`;
};

const recipeToPlainText = (recipe: Recipe) => {
  const ingredients = recipe.ingredients
    .map(
      (ingredient) =>
        `- ${ingredient.amount || ""} ${ingredient.unit || ""} ${ingredient.name}${
          ingredient.notes ? ` (${ingredient.notes})` : ""
        }`.trim()
    )
    .join("\n");

  const instructions = recipe.instructions
    .map((step) => `${step.stepNumber}. ${step.description}`)
    .join("\n");

  return `${recipe.title}\n\n${recipe.description || ""}\n\nCuisine: ${
    recipe.cuisine || "International"
  }\nPrep: ${recipe.prepTime || "N/A"} | Cook: ${recipe.cookTime || "N/A"} | Servings: ${
    recipe.servings || "N/A"
  }\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
};

const recipeToMarkdown = (recipe: Recipe) => {
  const ingredients = recipe.ingredients
    .map((ingredient) =>
      `- **${ingredient.amount || ""} ${ingredient.unit || ""}** ${ingredient.name}${
        ingredient.notes ? ` _(${ingredient.notes})_` : ""
      }`.trim()
    )
    .join("\n");

  const instructions = recipe.instructions
    .map((step) => `${step.stepNumber}. ${step.description}`)
    .join("\n");

  return `# ${recipe.title}

${recipe.description || ""}

**Cuisine:** ${recipe.cuisine || "International"}  
**Prep:** ${recipe.prepTime || "N/A"} • **Cook:** ${recipe.cookTime || "N/A"} • **Servings:** ${
    recipe.servings || "N/A"
  }

## Ingredients
${ingredients}

## Instructions
${instructions}
`;
};

export const downloadPlainText = (recipe: Recipe) => {
  const blob = new Blob([recipeToPlainText(recipe)], { type: "text/plain;charset=utf-8" });
  saveAs(blob, sanitizeFileName(recipe.title, "txt"));
};

export const downloadMarkdown = (recipe: Recipe) => {
  const blob = new Blob([recipeToMarkdown(recipe)], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, sanitizeFileName(recipe.title, "md"));
};

export const exportRecipeToPDF = (recipe: Recipe) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(recipe.title, margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const metaLines = doc.splitTextToSize(
    `Cuisine: ${recipe.cuisine || "International"} | Prep: ${recipe.prepTime || "N/A"} | Cook: ${
      recipe.cookTime || "N/A"
    } | Servings: ${recipe.servings || "N/A"}`,
    500
  );
  doc.text(metaLines, margin, y);
  y += metaLines.length * 14 + 10;

  if (recipe.description) {
    const descLines = doc.splitTextToSize(recipe.description, 500);
    doc.text(descLines, margin, y);
    y += descLines.length * 14 + 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ingredients", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  recipe.ingredients.forEach((ingredient) => {
    const line = `${ingredient.amount || ""} ${ingredient.unit || ""} ${ingredient.name}${
      ingredient.notes ? ` (${ingredient.notes})` : ""
    }`;
    const wrapped = doc.splitTextToSize(line.trim(), 500);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14;
  });

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Instructions", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  recipe.instructions.forEach((step) => {
    const line = `${step.stepNumber}. ${step.description}`;
    const wrapped = doc.splitTextToSize(line, 500);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14 + 4;
  });

  doc.save(sanitizeFileName(recipe.title, "pdf"));
};

