import fs from "fs";
import path from "path";

const root = process.cwd();
const files = [
  "apps/web/src/app/admin/orders/page.tsx",
  "apps/web/src/app/admin/messages/page.tsx",
  "apps/web/src/app/admin/products/page.tsx",
  "apps/web/src/app/admin/products/new/page.tsx",
  "apps/web/src/app/admin/products/[id]/page.tsx",
  "apps/web/src/app/admin/users/page.tsx",
  "apps/web/src/app/admin/transactions/page.tsx",
  "apps/web/src/app/admin/analytics/page.tsx",
  "apps/web/src/app/admin/verify-qr/page.tsx",
];

/** Add dark class after a light class if not already present nearby */
function inject(classes, lightToken, darkToken) {
  if (!classes.includes(lightToken)) return classes;
  // Already has this dark token
  if (classes.includes(darkToken)) return classes;
  // Insert dark token right after light token occurrence
  return classes.split(" ").map((c) => (c === lightToken ? `${c} ${darkToken}` : c)).join(" ");
}

function transformClassString(raw) {
  let c = raw;

  // Page / surface backgrounds
  c = inject(c, "bg-light-grey", "dark:bg-gray-900");
  if (c.includes("min-h-screen") && c.includes("bg-gray-50")) {
    c = inject(c, "bg-gray-50", "dark:bg-gray-900");
  } else if (c.includes("bg-gray-50") && !c.includes("dark:bg-gray-")) {
    c = inject(c, "bg-gray-50", "dark:bg-gray-800/50");
  }

  c = inject(c, "bg-white", "dark:bg-gray-800");
  c = inject(c, "bg-gray-100", "dark:bg-gray-700");
  c = inject(c, "bg-gray-200", "dark:bg-gray-700");

  // Borders
  c = inject(c, "border-border", "dark:border-gray-700");
  c = inject(c, "border-gray-200", "dark:border-gray-700");
  c = inject(c, "border-gray-100", "dark:border-gray-700");
  c = inject(c, "border-gray-300", "dark:border-gray-600");
  // bare border / border-b / border-t / border-r (exact tokens)
  for (const b of ["border", "border-b", "border-t", "border-r", "border-l"]) {
    if (c.split(/\s+/).includes(b) && !c.includes("dark:border-gray-700") && !c.includes("dark:border-gray-600")) {
      c = inject(c, b, "dark:border-gray-700");
    }
  }

  // Text
  c = inject(c, "text-gray-900", "dark:text-white");
  c = inject(c, "text-navy", "dark:text-white");
  c = inject(c, "text-gray-700", "dark:text-gray-300");
  c = inject(c, "text-gray-600", "dark:text-gray-300");
  c = inject(c, "text-navy/70", "dark:text-gray-300");
  c = inject(c, "text-navy/80", "dark:text-gray-200");
  c = inject(c, "text-gray-500", "dark:text-gray-400");
  c = inject(c, "text-navy/50", "dark:text-gray-400");
  c = inject(c, "text-navy/60", "dark:text-gray-400");
  c = inject(c, "text-gray-400", "dark:text-gray-500");
  c = inject(c, "text-navy/40", "dark:text-gray-500");
  c = inject(c, "text-gray-300", "dark:text-gray-600");

  // Hovers
  c = inject(c, "hover:bg-gray-100", "dark:hover:bg-gray-700");
  c = inject(c, "hover:bg-gray-50", "dark:hover:bg-gray-700");
  c = inject(c, "hover:bg-light-grey", "dark:hover:bg-gray-700");
  c = inject(c, "hover:text-gray-900", "dark:hover:text-white");
  c = inject(c, "hover:text-navy", "dark:hover:text-white");

  // Inputs / selects: if has focus:ring and border, ensure dark input styles
  const tokens = c.split(/\s+/);
  const isField =
    tokens.some((t) => t.startsWith("focus:ring")) &&
    (tokens.includes("border") || tokens.some((t) => t.startsWith("border-") || t.startsWith("dark:border-")));
  if (isField) {
    if (!c.includes("dark:bg-gray-800") && !c.includes("dark:bg-gray-")) {
      // may already have bg-white dark:bg-gray-800
      if (!tokens.includes("bg-white")) {
        c += " dark:bg-gray-800";
      }
    }
    if (c.includes("dark:border-gray-700") && isField) {
      c = c.replace("dark:border-gray-700", "dark:border-gray-600");
    } else if (!c.includes("dark:border-gray-600") && !c.includes("dark:border-gray-700")) {
      c += " dark:border-gray-600";
    }
    if (!c.includes("dark:text-gray-100") && !c.includes("dark:text-white")) {
      c += " dark:text-gray-100";
    }
  }

  // Collapse duplicate spaces
  return c.replace(/\s+/g, " ").trim();
}

function transformFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  // Match className="..." and className={`...`} static parts carefully — only double-quoted className for safety
  const out = src.replace(/className="([^"]*)"/g, (full, classes) => {
    return `className="${transformClassString(classes)}"`;
  });

  // Also handle template literals with only static content (no ${})
  const out2 = out.replace(/className=\{`([^`$]*)`\}/g, (full, classes) => {
    return `className={\`${transformClassString(classes)}\`}`;
  });

  // Template literals WITH expressions: transform static segments around ${}
  const out3 = out2.replace(/className=\{`([\s\S]*?)`\}/g, (full, body) => {
    if (!body.includes("${")) {
      return `className={\`${transformClassString(body)}\`}`;
    }
    // Split by ${...} expressions preserving them
    const parts = [];
    let i = 0;
    while (i < body.length) {
      const start = body.indexOf("${", i);
      if (start === -1) {
        parts.push({ type: "static", value: body.slice(i) });
        break;
      }
      if (start > i) parts.push({ type: "static", value: body.slice(i, start) });
      // Find matching closing }
      let depth = 0;
      let j = start + 1;
      for (; j < body.length; j++) {
        if (body[j] === "{") depth++;
        else if (body[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      parts.push({ type: "expr", value: body.slice(start, j) });
      i = j;
    }
    const rebuilt = parts
      .map((p) => (p.type === "static" ? transformClassString(p.value) : p.value))
      .join("");
    return `className={\`${rebuilt}\`}`;
  });

  fs.writeFileSync(filePath, out3);
  console.log("Updated", path.relative(root, filePath));
}

for (const f of files) {
  transformFile(path.join(root, f));
}
console.log("Done");
