import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-iiitt-portal",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "userProfiles/studentA"), { uid: "studentA", active: true, role: "student", rosterId: "261161" });
    await setDoc(doc(db, "userProfiles/studentB"), { uid: "studentB", active: true, role: "student", rosterId: "261261" });
    await setDoc(doc(db, "staff/lecturerA"), { active: true, role: "lecturer" });
    await setDoc(doc(db, "staff/lecturerB"), { active: true, role: "lecturer" });
    await setDoc(doc(db, "teachingAssignments/offeringA_lecturerA"), { offeringId: "offeringA", lecturerUid: "lecturerA", active: true });
    await setDoc(doc(db, "courseOfferings/offeringA"), { active: true });
    await setDoc(doc(db, "enrollments/offeringA_studentA"), { offeringId: "offeringA", studentUid: "studentA", active: true });
    await setDoc(doc(db, "sessions/sessionA"), { offeringId: "offeringA", state: "completed" });
    await setDoc(doc(db, "studentRoster/261161"), { emailNormalized: "studenta@iiitt.ac.in", active: true });
    await setDoc(doc(db, "attendance/sessionA_studentA"), { sessionId: "sessionA", offeringId: "offeringA", studentUid: "studentA", mark: "present" });
    await setDoc(doc(db, "attendance/sessionA_studentB"), { sessionId: "sessionA", offeringId: "offeringA", studentUid: "studentB", mark: "absent" });
  });
});

test("students can read their own profile but cannot change roles or profile fields", async () => {
  const db = env.authenticatedContext("studentA", { email: "studenta@iiitt.ac.in", email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "userProfiles/studentA")));
  await assertFails(getDoc(doc(db, "userProfiles/studentB")));
  await assertFails(setDoc(doc(db, "userProfiles/studentA"), { role: "admin" }));
});

test("the roster is never readable from a client", async () => {
  const db = env.authenticatedContext("studentA", { email: "studenta@iiitt.ac.in", email_verified: true }).firestore();
  await assertFails(getDoc(doc(db, "studentRoster/261161")));
});

test("students can read only their own attendance marks", async () => {
  const db = env.authenticatedContext("studentA", { email: "studenta@iiitt.ac.in", email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "attendance/sessionA_studentA")));
  await assertFails(getDoc(doc(db, "attendance/sessionA_studentB")));
  await assertFails(setDoc(doc(db, "attendance/sessionA_studentA"), { mark: "absent" }));
});

test("assigned lecturers can read their offering but unassigned lecturers cannot", async () => {
  const assigned = env.authenticatedContext("lecturerA", { email: "lecturera@iiitt.ac.in", email_verified: true }).firestore();
  const unassigned = env.authenticatedContext("lecturerB", { email: "lecturerb@iiitt.ac.in", email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(assigned, "sessions/sessionA")));
  await assertSucceeds(getDoc(doc(assigned, "attendance/sessionA_studentA")));
  await assertFails(getDoc(doc(unassigned, "sessions/sessionA")));
  await assertFails(getDoc(doc(unassigned, "attendance/sessionA_studentA")));
});


test("unverified or non-institutional identities cannot read student attendance", async () => {
  const unverified = env.authenticatedContext("studentA", {
    email: "studenta@iiitt.ac.in", email_verified: false,
  }).firestore();
  const external = env.authenticatedContext("studentA", {
    email: "student@example.com", email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(unverified, "userProfiles/studentA")));
  await assertFails(getDoc(doc(unverified, "attendance/sessionA_studentA")));
  await assertFails(getDoc(doc(external, "attendance/sessionA_studentA")));
});

test("clients cannot create or mutate sessions or attendance", async () => {
  const lecturer = env.authenticatedContext("lecturerA", { email: "lecturera@iiitt.ac.in", email_verified: true }).firestore();
  await assertFails(setDoc(doc(lecturer, "sessions/fake"), { offeringId: "offeringA", state: "completed" }));
  await assertFails(setDoc(doc(lecturer, "attendance/fake"), { studentUid: "studentA", mark: "present" }));
});

test("deactivating a roster entry revokes student data access", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "studentRoster/261161"), {
      emailNormalized: "studenta@iiitt.ac.in", active: false,
    });
  });
  const db = env.authenticatedContext("studentA", { email: "studenta@iiitt.ac.in", email_verified: true }).firestore();
  await assertFails(getDoc(doc(db, "courseOfferings/offeringA")));
  await assertFails(getDoc(doc(db, "attendance/sessionA_studentA")));
});
