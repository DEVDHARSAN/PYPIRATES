import bcrypt from "bcryptjs";
import { classifyFeedback } from "./clustering.js";

const FIRST_NAMES = ["Aditi", "Rohan", "Priya", "Karthik", "Sneha", "Arjun", "Meera", "Vikram", "Ananya", "Rahul", "Divya", "Sanjay", "Ishita", "Nikhil", "Pooja", "Aarav", "Tanvi", "Yash"];
const LAST_NAMES = ["Sharma", "Iyer", "Reddy", "Nair", "Gupta", "Menon", "Rao", "Verma", "Krishnan", "Pillai", "Bose", "Kapoor", "Das", "Chatterjee", "Mehta", "Joshi", "Pandey", "Suresh"];
const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Information Technology", "Civil Engineering", "Biotechnology"];

const FEEDBACK_TEMPLATES = [
  ["Wi-Fi is extremely slow in Block B", "The Wi-Fi connection in Block B has been extremely slow for the past week, making it hard to attend online sessions."],
  ["Internet connection drops frequently in the lab", "Network connection in the computer lab drops every 10-15 minutes during practical sessions."],
  ["No Wi-Fi coverage in the library reading hall", "There is barely any Wi-Fi signal in the second floor reading hall of the library."],
  ["Hostel bathrooms need urgent maintenance", "Hostel bathroom water leakage has not been fixed for two weeks despite multiple complaints."],
  ["Hostel water supply is inconsistent", "The hostel washrooms have irregular water supply, especially in the mornings."],
  ["Electrical socket not working in hostel room", "One of the sockets in my hostel room has been non-functional for over a month."],
  ["The college bus arrives 20 minutes late every morning", "Route 4 bus consistently arrives late, causing students to miss the first lecture."],
  ["Bus route 7 skips the usual stop", "The evening bus on route 7 has stopped taking the usual stop near the north gate."],
  ["Overcrowded college buses during peak hours", "Buses are extremely overcrowded between 8-9 AM making the commute unsafe."],
  ["The food quality has decreased recently", "Canteen food quality has gone down significantly over the past month."],
  ["The canteen queue is too long during lunch", "Lunch queues at the canteen take over 30 minutes, cutting into break time."],
  ["Mess food lacks variety", "The hostel mess serves the same menu repeatedly through the week."],
  ["Unhygienic conditions in canteen seating area", "The seating area in the main canteen is often unclean during peak hours."],
  ["Faculty not responding to doubts on time", "Emails to faculty regarding assignment doubts often go unanswered for days."],
  ["Course syllabus not covered before exams", "Several topics on the syllabus were not covered in class before the semester exam."],
  ["Great improvement in lecture quality this semester", "The new teaching methodology introduced this semester has been really helpful and engaging."],
  ["Examination timetable was announced too late", "The exam timetable was released only 3 days before exams began, causing preparation issues."],
  ["Revaluation results delayed significantly", "Revaluation results for the last semester are still pending after two months."],
  ["Exam hall seating arrangement was confusing", "Seating arrangements for the mid-semester exam were not clearly communicated."],
  ["Classroom projectors are not working", "Projectors in three classrooms on the third floor have not worked all semester."],
  ["Classroom AC not functioning in summer", "Air conditioning has not worked in room 204 despite the heat."],
  ["Insufficient seating in lecture hall", "Lecture hall 3 does not have enough chairs for the full batch strength."],
  ["The library needs more technical books", "The library has very few updated technical books for the final-year electives."],
  ["Library timings are too restrictive during exams", "Library closes at 6 PM even during exam season, limiting study time."],
  ["Library reading room is always full", "It's nearly impossible to find a seat in the reading room after 10 AM."],
  ["Water cooler not working near the auditorium", "The water cooler outside the main auditorium has been broken for weeks."],
  ["Wi-Fi speed improved after recent upgrade, thank you", "Really appreciate the recent Wi-Fi bandwidth upgrade — download speeds are much better now."],
  ["Hostel warden resolved maintenance issue quickly", "Thank you to the hostel warden for fixing the water leakage issue within two days of reporting."],
  ["New bus route added, very convenient", "The newly added bus route near the east campus gate has made commuting much easier."],
  ["Canteen introduced healthier food options", "Glad to see more healthy food options added to the canteen menu this month."],
];

export async function seedIfEmpty(prisma) {
  const count = await prisma.user.count();
  if (count > 0) return { seeded: false };

  const adminPassHash = await bcrypt.hash("Admin@123", 10);
  const studentPassHash = await bcrypt.hash("demo123", 10);

  const admins = await Promise.all([
    prisma.user.create({ data: { name: "Dr. Lakshmi Narayan", email: "admin@pypirates.edu", passwordHash: adminPassHash, role: "ADMIN", department: "Student Affairs / ECC Cell" } }),
    prisma.user.create({ data: { name: "Suresh Kumar", email: "ecc.staff@pypirates.edu", passwordHash: adminPassHash, role: "ADMIN", department: "ECC Cell" } }),
  ]);

  const students = [];
  for (let i = 0; i < 18; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const student = await prisma.user.create({
      data: {
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@pypirates.edu`,
        passwordHash: studentPassHash,
        role: "STUDENT",
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        year: (i % 4) + 1,
      },
    });
    students.push(student);
  }

  const statuses = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED"];
  let n = 0;
  for (const [title, description] of FEEDBACK_TEMPLATES) {
    n++;
    const student = students[n % students.length];
    const cls = classifyFeedback(title, description);
    const status = statuses[n % statuses.length];
    const daysAgo = n % 20;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.feedback.create({
      data: {
        userId: student.id,
        title,
        description,
        category: cls.category,
        sentiment: cls.sentiment,
        priority: cls.priority,
        clusterId: cls.clusterId,
        status,
        createdAt,
      },
    });
  }

  return { seeded: true, admins: admins.length, students: students.length, feedback: FEEDBACK_TEMPLATES.length };
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const result = await seedIfEmpty(prisma);
  console.log(result.seeded ? `Seeded ${result.admins} admins, ${result.students} students, ${result.feedback} feedback items.` : "Database already has users — skipped seeding.");
  await prisma.$disconnect();
}
