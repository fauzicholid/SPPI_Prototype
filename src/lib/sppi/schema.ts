import { z } from "zod";

const rubricEntry = z.object({
  code: z.enum(["SPI", "CPI", "SC", "VS", "CR", "FIR", "ACC", "XAI", "PDP", "OGC"]),
  mode: z.literal("QUICK"),
  rubricLevel: z.number().int().min(1).max(5),
  justificationNote: z.string().optional().nullable(),
});

const preciseEntry = z.object({
  code: z.enum(["SPI", "CPI", "SC", "VS", "CR", "FIR", "ACC", "OGC"]),
  mode: z.literal("PRECISE"),
  rawValues: z.record(z.string(), z.number()),
  justificationNote: z.string().optional().nullable(),
});

const structuredEntry = z.object({
  code: z.enum(["PDP", "XAI"]),
  mode: z.literal("PRECISE"),
  subItems: z.record(z.string(), z.number()),
  justificationNote: z.string().optional().nullable(),
});

export const indicatorEntrySchema = z.union([rubricEntry, preciseEntry, structuredEntry]);

export const updateAssessmentSchema = z.object({
  indicators: z.array(indicatorEntrySchema),
});

export const createAssessmentSchema = z.object({
  projectId: z.string().min(1),
  weightConfigId: z.string().optional(),
  cycleLabel: z.string().min(1),
});

export const dimensionWeightsSchema = z.object({
  m: z.number().min(0).max(1),
  k: z.number().min(0).max(1),
  s: z.number().min(0).max(1),
});

export const indicatorWeightsSchema = z.object({
  SPI: z.number().min(0).max(1),
  CPI: z.number().min(0).max(1),
  SC: z.number().min(0).max(1),
  VS: z.number().min(0).max(1),
  CR: z.number().min(0).max(1),
  FIR: z.number().min(0).max(1),
  ACC: z.number().min(0).max(1),
  XAI: z.number().min(0).max(1),
  PDP: z.number().min(0).max(1),
  OGC: z.number().min(0).max(1),
});

export const pdpSubItemWeightsSchema = z.object({
  lawfulBasis: z.number().min(0).max(1),
  purposeLimitation: z.number().min(0).max(1),
  minimization: z.number().min(0).max(1),
  retention: z.number().min(0).max(1),
  dpia: z.number().min(0).max(1),
  dataSubjectRights: z.number().min(0).max(1),
  breachNotification: z.number().min(0).max(1),
});

export const createWeightConfigSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  dimensionWeights: dimensionWeightsSchema,
  indicatorWeights: indicatorWeightsSchema,
  pdpSubItemWeights: pdpSubItemWeightsSchema,
  activate: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["PROJECT_MANAGER", "PMO_PORTFOLIO", "RESEARCHER", "ADMIN", "VIEWER"]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["PROJECT_MANAGER", "PMO_PORTFOLIO", "RESEARCHER", "ADMIN", "VIEWER"]),
});

export const assignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ASSESSOR", "VIEWER"]),
});
