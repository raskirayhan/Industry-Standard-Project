import config from "../config";
import { computeShipmentCost, generateTrackingNumber } from "../modules/shipment/shipment.utils";

async function runUnitSmokeTests() {
  console.log("🧪 Running backend unit & calculation tests...\n");

  try {
    // 1. Test Tracking Number Generator
    const trk = generateTrackingNumber();
    console.log(`✅ Tracking number format verified: ${trk}`);
    if (!trk.startsWith("TRK-") || trk.length < 10) {
      throw new Error(`Invalid tracking number format: ${trk}`);
    }

    // 2. Test Intra-Zone Pricing Calculation
    const intraPricing = computeShipmentCost({
      weightKg: 2.5,
      lengthCm: 20,
      widthCm: 15,
      heightCm: 10,
      isSameZone: true,
      isFragile: false,
    });
    console.log("✅ Intra-zone shipping cost calculation verified:", intraPricing);
    if (intraPricing.baseFare !== 60 || intraPricing.totalCost <= 0) {
      throw new Error("Intra-zone pricing logic error");
    }

    // 3. Test Inter-Zone Pricing with Volumetric Weight and Fragile Surcharge
    const interPricing = computeShipmentCost({
      weightKg: 1.0,
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30, // Volumetric weight = (50*40*30)/5000 = 12 kg
      isSameZone: false,
      isFragile: true,
    });
    console.log("✅ Inter-zone volumetric pricing verified:", interPricing);
    if (interPricing.chargeableWeightKg !== 12 || interPricing.surcharge !== 50) {
      throw new Error("Volumetric weight or fragile surcharge calculation error");
    }

    console.log("\n🎉 All critical business logic unit tests passed successfully!");
  } catch (error) {
    console.error("❌ Unit test failed:", error);
    process.exit(1);
  }
}

runUnitSmokeTests();
