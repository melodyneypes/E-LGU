const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Comprehensive Filipino First and Last Names for authentic sample generation
const FIRST_NAMES_MALE = [
  "Juan", "Jose", "Mark", "Christian", "John", "Michael", "Angelo", "Gabriel", "Joshua", "Daniel",
  "Ramon", "Antonio", "Eduardo", "Francis", "Paolo", "Carlo", "Rafael", "Emmanuel", "Dominic", "Adrian",
  "Kenneth", "Marvin", "Bryan", "Jerome", "Rene", "Richard", "Dennis", "Rolando", "Gilbert", "Jeffrey",
  "Christopher", "Rogelio", "Rodrigo", "Ferdinand", "Benigno", "Manuel", "Corazon", "Diosdado", "Elpidio", "Ramon",
  "Danilo", "Reynaldo", "Ernesto", "Jaime", "Vicente", "Guillermo", "Bonaventura", "Mariano", "Esteban", "Santiago"
];

const FIRST_NAMES_FEMALE = [
  "Maria", "Ana", "Angelica", "Christina", "Grace", "Patricia", "Jennifer", "Michelle", "Stephanie", "Katherine",
  "Joy", "Bea", "Camille", "Diana", "Elena", "Francesca", "Giselle", "Hazel", "Irene", "Jasmine",
  "Kristine", "Lourdes", "Teresa", "Margarita", "Rosario", "Veronica", "Bernadette", "Clarissa", "Divina", "Estrella",
  "Fe", "Gloria", "Imelda", "Josefina", "Ligaya", "Milagros", "Norma", "Ofelia", "Perla", "Remedios",
  "Salome", "Socorro", "Trinidad", "Vilma", "Zenaida", "Liza", "Rowena", "Abigail", "Cherry", "Daisy"
];

const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Tomas", "Andrada",
  "Villanueva", "Ramos", "Castro", "Flores", "Aquino", "Navarro", "Salazar", "Mercado", "Del Rosario", "Morales",
  "Perez", "Castillo", "Francisco", "Soriano", "De Guzman", "Santiago", "Hernandez", "Valdez", "Gutierrez", "Tolentino",
  "Pineda", "Valenzuela", "Corpuz", "Domingo", "Agustin", "Marquez", "Manalo", "Dela Cruz", "Pascual", "Roxas",
  "Miranda", "Fernandez", "Sison", "Vergara", "Buenaventura", "Dizon", "Guerrero", "Rios", "Samson", "Velasco"
];

const BARANGAYS = [
  "Barangay 1",
  "Barangay 2",
  "Abar",
  "Ambalangan-Dalin",
  "Coral",
  "Golden",
  "Luyan",
  "Nilombot",
  "Poblacion",
  "Primicias",
  "Santa Maria",
  "Torres"
];

const STREETS = [
  "Rizal Street", "Magsaysay Avenue", "Bonifacio Street", "Luna Street", "Del Pilar Street",
  "Burgos Street", "Quezon Boulevard", "Mabini Street", "Zamora Street", "Pangasinan Provincial Road",
  "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Sitio Central", "Sitio Riverside", "Sitio North"
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPhone() {
  const prefixes = ["0917", "0918", "0919", "0920", "0921", "0928", "0939", "0945", "0956", "0977", "0998"];
  const prefix = getRandomItem(prefixes);
  const num = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${num}`;
}

async function main() {
  console.log("🌱 Generating 3,000 Resident records and municipal transactions...");

  const existingResidentCount = await prisma.resident.count();
  console.log(`Current Resident count in DB: ${existingResidentCount}`);

  const TARGET_COUNT = 3000;
  const neededResidents = Math.max(0, TARGET_COUNT - existingResidentCount);

  if (neededResidents === 0) {
    console.log(`✅ Already have ${existingResidentCount} residents in database (target: 3000). Skipping resident creation.`);
  } else {
    console.log(`Creating ${neededResidents} additional realistic resident records...`);

    const batchSize = 500;
    const batches = Math.ceil(neededResidents / batchSize);

    for (let b = 0; b < batches; b++) {
      const currentBatchSize = Math.min(batchSize, neededResidents - (b * batchSize));
      const residentRecords = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = isMale ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
        const lastName = getRandomItem(LAST_NAMES);
        const middleName = getRandomItem(LAST_NAMES);
        const age = getRandomInt(18, 85);
        
        const birthYear = 2026 - age;
        const birthMonth = getRandomInt(0, 11);
        const birthDay = getRandomInt(1, 28);
        const dateOfBirth = new Date(birthYear, birthMonth, birthDay);

        const barangay = getRandomItem(BARANGAYS);
        const street = getRandomItem(STREETS);
        const houseNumber = `${getRandomInt(1, 999)}`;
        const gender = isMale ? "Male" : "Female";
        const civilStatus = age < 25 ? "Single" : (Math.random() > 0.3 ? "Married" : "Widowed");
        
        const isSenior = age >= 60;
        const isPWD = Math.random() < 0.05;
        const isSoloParent = !isSenior && Math.random() < 0.08;
        const is4Ps = Math.random() < 0.15;
        
        // ~90% Approved, ~10% Pending registration status
        const registrationStatus = Math.random() > 0.1 ? "APPROVED" : "PENDING";
        const emailName = `${firstName.toLowerCase().replace(/ /g, '')}.${lastName.toLowerCase().replace(/ /g, '')}${getRandomInt(10, 999)}@gmail.com`;

        residentRecords.push({
          firstName,
          lastName,
          middleName,
          gender,
          dateOfBirth,
          age,
          civilStatus,
          citizenship: "Filipino",
          houseNumber,
          street,
          purok: `Purok ${getRandomInt(1, 6)}`,
          barangay,
          municipality: "Balungao",
          province: "Pangasinan",
          contactNumber: getRandomPhone(),
          email: emailName,
          isHead: Math.random() < 0.3,
          isSenior,
          isPWD,
          isSoloParent,
          is4Ps,
          dataPrivacyConsent: true,
          consentTimestamp: new Date(),
          registrationStatus,
          createdAt: new Date(Date.now() - getRandomInt(0, 180) * 24 * 60 * 60 * 1000)
        });
      }

      await prisma.resident.createMany({
        data: residentRecords
      });

      console.log(`  ✓ Inserted batch ${b + 1}/${batches} (${currentBatchSize} records)`);
    }
  }

  const finalResidentCount = await prisma.resident.count();
  console.log(`🎉 Total Resident Count in Database: ${finalResidentCount}`);

  // Fetch some active transaction types to link realistic transactions
  const txTypes = await prisma.transactionType.findMany();
  console.log(`Found ${txTypes.length} transaction types in DB.`);

  if (txTypes.length > 0) {
    const existingTxCount = await prisma.transaction.count();
    console.log(`Current Transactions count: ${existingTxCount}`);

    if (existingTxCount < 100) {
      console.log("Generating 150 diverse municipal transactions across departments...");
      
      const sampleResidents = await prisma.resident.findMany({
        take: 200,
        where: { registrationStatus: "APPROVED" }
      });

      const statuses = ["PAID", "FOR_REQUESTING", "FOR_INSPECTION", "COMPLETED", "PENDING"];
      const transactionsToCreate = [];

      for (let t = 0; t < 150; t++) {
        const resident = getRandomItem(sampleResidents);
        const txType = getRandomItem(txTypes);
        const status = getRandomItem(statuses);

        const amount = txType.baseFee > 0 ? txType.baseFee : getRandomInt(150, 2500);
        
        const snapshot = {
          fullName: `${resident.firstName} ${resident.middleName ? resident.middleName[0] + '. ' : ''}${resident.lastName}`,
          barangay: resident.barangay,
          contactNumber: resident.contactNumber,
          email: resident.email,
          civilStatus: resident.civilStatus
        };

        transactionsToCreate.push({
          typeId: txType.id,
          status: status,
          residentSnapshot: snapshot,
          additionalData: { purpose: "Official Government Requirement", priority: false },
          totalAmount: amount,
          isPaid: status === "PAID" || status === "COMPLETED",
          queueNumber: `Q-${getRandomInt(1000, 9999)}`,
          createdAt: new Date(Date.now() - getRandomInt(0, 60) * 24 * 60 * 60 * 1000)
        });
      }

      // Insert in chunks
      for (const txData of transactionsToCreate) {
        try {
          await prisma.transaction.create({ data: txData });
        } catch (e) {
          // Ignore unique queue code collisions if any
        }
      }

      console.log("✅ Seeded sample transactions across Treasury, BPLO, LCR, RHU, Assessor, and POSO!");
    }
  }

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
