export interface ParsedLabSpecItem {
  code: string;
  quantity: number;
}

export const knownLabTestCodes: Record<string, string> = {
  VGW: "Volumiek gewicht",
  KVD: "Korrelverdeling",
  SDP: "Samendrukkingsproef",
  OED: "Oedometerproef",
  ATB: "Atterberg-grenzen",
  TRIAX: "Triaxiaal",
  TV: "Torvane",
  ZKF: "Zeefkromme",
};

const knownLabTestAliases: Record<string, string[]> = {
  VGW: [
    "vgw",
    "volumegewicht",
    "volumegewichten",
    "volumiek gewicht",
    "volumieke gewichten",
  ],
  KVD: [
    "kvd",
    "korrelverdeling",
    "korrelverdelingen",
    "korrelgrootte",
    "korrelgroottes",
  ],
  SDP: ["sdp", "samendrukkingsproef", "samendrukkingsproeven", "samendrukking"],
  OED: ["oed", "oedometer", "oedometerproef", "oedometerproeven"],
  ATB: ["atb", "atterberg", "atterberg grenzen", "atterbergse grenzen"],
  TRIAX: ["triax", "triaxiaal", "triaxiaal proef", "triaxiaalproef"],
  TV: ["tv", "torvane"],
  ZKF: ["zkf", "zeefkromme"],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractSection(
  description: string | null | undefined,
  targetHeader: string,
  stopHeaders: string[],
) {
  if (!description) {
    return null;
  }

  const normalizedTargetHeader = normalizeText(targetHeader);
  const normalizedStopHeaders = new Set(
    stopHeaders.map((header) => normalizeText(header)),
  );
  const lines = description.split(/\r?\n/);
  const collectedLines: string[] = [];
  let inTargetSection = false;

  for (const line of lines) {
    const sectionHeaderMatch = line.match(/^\s*([^:]+)\s*:\s*(.*)$/);

    if (sectionHeaderMatch) {
      const normalizedHeader = normalizeText(sectionHeaderMatch[1]);

      if (!inTargetSection && normalizedHeader === normalizedTargetHeader) {
        inTargetSection = true;

        if (sectionHeaderMatch[2].trim()) {
          collectedLines.push(sectionHeaderMatch[2].trim());
        }

        continue;
      }

      if (inTargetSection && normalizedStopHeaders.has(normalizedHeader)) {
        break;
      }
    }

    if (inTargetSection) {
      collectedLines.push(line);
    }
  }

  const sectionText = collectedLines.join("\n").trim();
  return sectionText.length > 0 ? sectionText : null;
}

function resolveLabTestCode(label: string) {
  const normalizedLabel = normalizeText(label);

  if (!normalizedLabel) {
    return null;
  }

  const aliasEntries = Object.entries(knownLabTestAliases)
    .flatMap(([code, aliases]) =>
      aliases.map((alias) => ({
        code,
        alias: normalizeText(alias),
      })),
    )
    .sort((left, right) => right.alias.length - left.alias.length);

  for (const entry of aliasEntries) {
    if (
      normalizedLabel === entry.alias ||
      normalizedLabel.includes(entry.alias) ||
      entry.alias.includes(normalizedLabel)
    ) {
      return entry.code;
    }
  }

  return null;
}

function parseLabAssignmentSection(description: string | null | undefined) {
  const assignmentText = extractSection(
    description,
    "Lab opdracht",
    ["Opmerkingen"],
  );

  if (!assignmentText) {
    return [];
  }

  return assignmentText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(.+)$/i);

      if (!match) {
        return null;
      }

      const code = resolveLabTestCode(match[2]);

      if (!code) {
        return null;
      }

      return {
        code,
        quantity: Number(match[1].replace(",", ".")),
      };
    })
    .filter((item): item is ParsedLabSpecItem => Boolean(item));
}

export function parseLabSpec(description: string | null | undefined) {
  if (!description) {
    return [];
  }

  const specMatch = description.match(/LABSPEC\s*:\s*([^\r\n]+)/i);

  if (!specMatch) {
    return [];
  }

  return specMatch[1]
    .split(/[;,]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(
        /^([A-Za-z0-9_-]+)\s*=\s*(\d+(?:[.,]\d+)?)$/i,
      );

      if (!match) {
        return null;
      }

      return {
        code: match[1].toUpperCase(),
        quantity: Number(match[2].replace(",", ".")),
      };
    })
    .filter((item): item is ParsedLabSpecItem => Boolean(item));
}

export function parseProjectTestsFromDescription(
  description: string | null | undefined,
) {
  const parsedLabSpec = parseLabSpec(description);

  if (parsedLabSpec.length > 0) {
    return parsedLabSpec;
  }

  return parseLabAssignmentSection(description);
}

export function extractProjectNotesFromDescription(
  description: string | null | undefined,
) {
  return extractSection(description, "Opmerkingen", []);
}
