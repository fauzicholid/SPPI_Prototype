import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeSPPI } from "../src/lib/sppi/engine";
import { DEFAULT_DIMENSION_WEIGHTS, DEFAULT_INDICATOR_WEIGHTS, DEFAULT_PDP_SUB_ITEM_WEIGHTS } from "../src/lib/sppi/weights";
import type { IndicatorCode, IndicatorInput } from "../src/lib/sppi/types";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo1234";

const QUICK_CODES: IndicatorCode[] = ["SPI", "CPI", "SC", "VS", "CR", "FIR", "ACC", "XAI", "PDP", "OGC"];

function quickInputs(levels: Record<IndicatorCode, number>): IndicatorInput[] {
  return QUICK_CODES.map((code) => ({ code, mode: "QUICK", rubricLevel: levels[code] }));
}

// Precise-mode inputs reproducing the PRD's worked example exactly:
// D_m = 0.67, D_k = 0.58, D_s = 0.63, SPPI = 0.629 (~0.63), band High, action Monitor.
const WORKED_EXAMPLE_INPUTS: IndicatorInput[] = [
  { code: "SPI", mode: "PRECISE", rawValues: { ev: 0.67, pv: 1 } },
  { code: "CPI", mode: "PRECISE", rawValues: { ev: 0.67, ac: 1 } },
  { code: "SC", mode: "PRECISE", rawValues: { baselineItems: 100, changedItems: 33 } },
  { code: "VS", mode: "PRECISE", rawValues: { plannedVelocity: 100, actualVelocity: 58 } },
  { code: "CR", mode: "PRECISE", rawValues: { avgResponseDays: 100, targetResponseDays: 58 } },
  { code: "FIR", mode: "PRECISE", rawValues: { received: 100, incorporated: 58 } },
  { code: "ACC", mode: "PRECISE", rawValues: { rmse: 37, tolerance: 100 } },
  {
    code: "XAI",
    mode: "PRECISE",
    subItems: { attributionRecordExists: 1, faithfulnessThresholdMet: 1, complexityBelowCeiling: 0, plainLanguageSummaryAvailable: 0 },
  },
  {
    code: "PDP",
    mode: "PRECISE",
    subItems: {
      lawfulBasis: 0.5,
      purposeLimitation: 0.5,
      minimization: 0.5,
      retention: 0.5,
      dpia: 0.5,
      dataSubjectRights: 0.5,
      breachNotification: 0.5,
    },
  },
  { code: "OGC", mode: "PRECISE", rawValues: { implemented: 89, required: 100 } },
];

async function saveAssessment(params: {
  projectId: string;
  assessorId: string;
  weightConfigId: string;
  weightConfig: { indicatorWeights: unknown; dimensionWeights: unknown; pdpSubItemWeights: unknown };
  cycleLabel: string;
  inputs: IndicatorInput[];
}) {
  const outcome = computeSPPI({
    inputs: params.inputs,
    indicatorWeights: params.weightConfig.indicatorWeights as never,
    dimensionWeights: params.weightConfig.dimensionWeights as never,
    pdpSubItemWeights: params.weightConfig.pdpSubItemWeights as never,
  });

  const assessment = await prisma.assessment.create({
    data: {
      projectId: params.projectId,
      assessorId: params.assessorId,
      weightConfigId: params.weightConfigId,
      cycleLabel: params.cycleLabel,
      status: "COMPLETED",
    },
  });

  for (const computed of outcome.indicators) {
    const input = params.inputs.find((i) => i.code === computed.code)!;
    const score = await prisma.indicatorScore.create({
      data: {
        assessmentId: assessment.id,
        indicatorCode: computed.code,
        dimension: computed.dimension,
        inputMode: computed.mode,
        rubricLevel: input.mode === "QUICK" ? input.rubricLevel ?? null : null,
        rawValues: input.mode === "PRECISE" && input.rawValues ? input.rawValues : undefined,
        normalizedValue: computed.normalizedValue,
      },
    });
    if (input.mode === "PRECISE" && input.subItems) {
      for (const [itemCode, value] of Object.entries(input.subItems)) {
        await prisma.subItemScore.create({ data: { indicatorScoreId: score.id, itemCode, score: value } });
      }
    }
  }

  await prisma.sPPIResult.create({
    data: {
      assessmentId: assessment.id,
      weightConfigId: params.weightConfigId,
      dScoreM: outcome.dScoreM,
      dScoreK: outcome.dScoreK,
      dScoreS: outcome.dScoreS,
      sppiScore: outcome.sppiScore,
      classificationBand: outcome.classificationBand,
      weakestIndicator: outcome.weakestIndicator,
      recommendedAction: outcome.recommendedAction,
      sensitivityLow: outcome.sensitivityLow,
      sensitivityHigh: outcome.sensitivityHigh,
    },
  });

  return assessment;
}

async function main() {
  console.log("Seeding SPPI demo data...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [pm, pmo, researcher, admin, viewer] = await Promise.all([
    prisma.user.upsert({
      where: { email: "pm@sppi.demo" },
      update: {},
      create: { name: "Dewi Anggraini", email: "pm@sppi.demo", passwordHash, role: "PROJECT_MANAGER" },
    }),
    prisma.user.upsert({
      where: { email: "pmo@sppi.demo" },
      update: {},
      create: { name: "Bima Saputra", email: "pmo@sppi.demo", passwordHash, role: "PMO_PORTFOLIO" },
    }),
    prisma.user.upsert({
      where: { email: "researcher@sppi.demo" },
      update: {},
      create: { name: "Dr. Nadia Kusuma", email: "researcher@sppi.demo", passwordHash, role: "RESEARCHER" },
    }),
    prisma.user.upsert({
      where: { email: "admin@sppi.demo" },
      update: {},
      create: { name: "Admin", email: "admin@sppi.demo", passwordHash, role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "viewer@sppi.demo" },
      update: {},
      create: { name: "Steering Committee", email: "viewer@sppi.demo", passwordHash, role: "VIEWER" },
    }),
  ]);

  const existingActive = await prisma.weightConfig.findFirst({ where: { active: true } });
  const weightConfig =
    existingActive ??
    (await prisma.weightConfig.create({
      data: {
        name: "Provisional Expert Weights (0.35 / 0.30 / 0.35)",
        source: "default",
        dimensionWeights: DEFAULT_DIMENSION_WEIGHTS as object,
        indicatorWeights: DEFAULT_INDICATOR_WEIGHTS as object,
        pdpSubItemWeights: DEFAULT_PDP_SUB_ITEM_WEIGHTS as object,
        active: true,
        createdById: researcher.id,
      },
    }));

  const wcParams = {
    indicatorWeights: weightConfig.indicatorWeights,
    dimensionWeights: weightConfig.dimensionWeights,
    pdpSubItemWeights: weightConfig.pdpSubItemWeights,
  };

  async function ensureProject(name: string, region: string, ownerId: string) {
    const existing = await prisma.project.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.project.create({
      data: {
        name,
        region,
        ownerId,
        assignments: { create: { userId: ownerId, role: "OWNER" } },
      },
    });
  }

  const digitalTwin = await ensureProject("Digital Twin Infrastructure X", "DKI Jakarta", pm.id);
  const iknWater = await ensureProject("IKN Water Network GeoAI", "Kalimantan Timur", pm.id);
  const smartCorridor = await ensureProject("Smart Corridor Sensing", "Jawa Barat", researcher.id);
  const coastalFlood = await ensureProject("Coastal Flood Early Warning", "Jawa Tengah", pmo.id);
  const agriYield = await ensureProject("Agri-Yield Monitoring Platform", "Sumatera Utara", pm.id);

  // Give the PMO/portfolio user assessor rights on a couple of projects,
  // and the Viewer stakeholder read access to one project directly.
  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: digitalTwin.id, userId: pmo.id } },
    update: {},
    create: { projectId: digitalTwin.id, userId: pmo.id, role: "ASSESSOR" },
  });
  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: digitalTwin.id, userId: viewer.id } },
    update: {},
    create: { projectId: digitalTwin.id, userId: viewer.id, role: "VIEWER" },
  });

  const hasAssessments = await prisma.assessment.findFirst();
  if (hasAssessments) {
    console.log("Assessments already exist — skipping demo assessment seeding.");
  } else {
    // Digital Twin: two cycles, the most recent reproducing the PRD's worked example exactly.
    await saveAssessment({
      projectId: digitalTwin.id,
      assessorId: pm.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2025-Q4",
      inputs: quickInputs({ SPI: 4, CPI: 4, SC: 3, VS: 3, CR: 3, FIR: 4, ACC: 4, XAI: 2, PDP: 3, OGC: 4 } as Record<IndicatorCode, number>),
    });
    await saveAssessment({
      projectId: digitalTwin.id,
      assessorId: pm.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2026-Q1",
      inputs: WORKED_EXAMPLE_INPUTS,
    });

    await saveAssessment({
      projectId: iknWater.id,
      assessorId: pm.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2026-Q1",
      inputs: quickInputs({ SPI: 3, CPI: 2, SC: 4, VS: 2, CR: 3, FIR: 2, ACC: 3, XAI: 3, PDP: 2, OGC: 3 } as Record<IndicatorCode, number>),
    });

    await saveAssessment({
      projectId: smartCorridor.id,
      assessorId: researcher.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2026-Q1",
      inputs: quickInputs({ SPI: 1, CPI: 1, SC: 1, VS: 1, CR: 1, FIR: 1, ACC: 1, XAI: 1, PDP: 1, OGC: 1 } as Record<IndicatorCode, number>),
    });

    await saveAssessment({
      projectId: coastalFlood.id,
      assessorId: pmo.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2026-Q1",
      inputs: quickInputs({ SPI: 4, CPI: 5, SC: 4, VS: 4, CR: 4, FIR: 4, ACC: 4, XAI: 3, PDP: 4, OGC: 4 } as Record<IndicatorCode, number>),
    });

    await saveAssessment({
      projectId: agriYield.id,
      assessorId: pm.id,
      weightConfigId: weightConfig.id,
      weightConfig: wcParams,
      cycleLabel: "2026-Q1",
      inputs: quickInputs({ SPI: 5, CPI: 5, SC: 5, VS: 5, CR: 4, FIR: 5, ACC: 5, XAI: 4, PDP: 5, OGC: 5 } as Record<IndicatorCode, number>),
    });
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password: demo1234):");
  console.log(`  Project Manager   pm@sppi.demo`);
  console.log(`  PMO / Portfolio   pmo@sppi.demo`);
  console.log(`  Researcher        researcher@sppi.demo`);
  console.log(`  Admin             admin@sppi.demo`);
  console.log(`  Viewer            viewer@sppi.demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
