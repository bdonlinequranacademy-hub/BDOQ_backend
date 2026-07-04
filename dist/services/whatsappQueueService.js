"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWhatsAppQueue = listWhatsAppQueue;
const StudentBilling_1 = require("../models/StudentBilling");
const PaymentRecord_1 = require("../models/PaymentRecord");
const TrialBooking_1 = require("../models/TrialBooking");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const User_1 = require("../models/User");
const paymentService_1 = require("./paymentService");
const classReminderService_1 = require("./classReminderService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const whatsappMessages_1 = require("../lib/whatsappMessages");
const verificationTokens_1 = require("./verificationTokens");
const scheduleUtils_1 = require("../utils/scheduleUtils");
function populatedStudent(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
function queuePhoneFields(raw, countryHint, message) {
    const parsed = (0, whatsappPhone_1.parseWhatsApp)(raw, countryHint);
    if (!parsed.ok) {
        return {
            phoneRaw: raw,
            phoneDisplay: raw,
            phoneValid: false,
            phoneError: parsed.error,
            waUrl: null,
        };
    }
    return {
        phoneRaw: parsed.value.e164,
        phoneDisplay: parsed.value.display,
        phoneValid: true,
        waUrl: (0, whatsappPhone_1.buildWaMeUrl)(parsed.value.waMeDigits, message),
    };
}
async function listWhatsAppQueue() {
    const items = [];
    const billings = await StudentBilling_1.StudentBilling.find({ isActive: true }).populate("student", "name email isActive role whatsapp country");
    for (const billing of billings) {
        const studentDoc = populatedStudent(billing.student);
        if (!studentDoc || !studentDoc.isActive || studentDoc.role !== "student") {
            continue;
        }
        const status = (0, paymentService_1.billingStatusLabel)(billing.paidUntil);
        if (status !== "due_soon" && status !== "overdue")
            continue;
        const pending = await PaymentRecord_1.PaymentRecord.exists({
            student: studentDoc._id,
            status: "pending",
        });
        if (pending)
            continue;
        const paidUntilText = billing.paidUntil
            ? billing.paidUntil.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            })
            : "not set";
        const category = status === "overdue" ? "payment_overdue" : "payment_due_soon";
        const message = status === "overdue"
            ? (0, whatsappMessages_1.paymentOverdueMessage)(studentDoc.name, paidUntilText)
            : (0, whatsappMessages_1.paymentDueSoonMessage)(studentDoc.name, paidUntilText);
        const raw = studentDoc.whatsapp?.trim() ?? "";
        const phone = raw
            ? queuePhoneFields(raw, studentDoc.country, message)
            : {
                phoneRaw: "",
                phoneDisplay: "Not set",
                phoneValid: false,
                phoneError: "Add WhatsApp on student profile or Users page.",
                waUrl: null,
            };
        items.push({
            id: `billing-${studentDoc._id.toString()}`,
            category,
            title: category === "payment_overdue" ? "Payment overdue" : "Payment due soon",
            subtitle: `Paid until ${paidUntilText}`,
            recipientName: studentDoc.name,
            recipientRole: "student",
            message,
            userId: studentDoc._id.toString(),
            ...phone,
        });
    }
    const trials = await TrialBooking_1.TrialBooking.find({ status: "new" })
        .sort({ createdAt: -1 })
        .limit(30);
    for (const trial of trials) {
        const message = (0, whatsappMessages_1.trialLeadFollowUpMessage)(trial.parentName);
        items.push({
            id: `trial-${trial._id.toString()}`,
            category: "new_trial",
            title: "New free class lead",
            subtitle: trial.learnerType,
            recipientName: trial.parentName,
            recipientRole: "lead",
            message,
            createdAt: trial.createdAt.toISOString(),
            ...queuePhoneFields(trial.whatsapp, trial.country, message),
        });
    }
    const admissions = await StudentAdmissionApplication_1.StudentAdmissionApplication.find({ status: "new" })
        .sort({ createdAt: -1 })
        .limit(30);
    for (const app of admissions) {
        const message = (0, whatsappMessages_1.admissionFollowUpMessage)(app.fullName);
        const country = typeof app.formData?.country === "string"
            ? app.formData.country
            : undefined;
        items.push({
            id: `admission-${app._id.toString()}`,
            category: "new_admission",
            title: "New student admission",
            subtitle: app.email,
            recipientName: app.fullName,
            recipientRole: "lead",
            message,
            createdAt: app.createdAt.toISOString(),
            ...queuePhoneFields(app.whatsapp, country, message),
        });
    }
    const studentsMissing = await User_1.User.find({
        role: "student",
        isActive: true,
        $or: [{ whatsapp: { $exists: false } }, { whatsapp: "" }],
    })
        .select("name email country createdAt")
        .limit(50);
    for (const student of studentsMissing) {
        items.push({
            id: `missing-${student._id.toString()}`,
            category: "missing_whatsapp",
            title: "Missing WhatsApp number",
            subtitle: student.email,
            recipientName: student.name,
            recipientRole: "student",
            phoneRaw: "",
            phoneDisplay: "Not set",
            phoneValid: false,
            phoneError: "Edit user in Admin → Users and add country code + number.",
            waUrl: null,
            message: "",
            userId: student._id.toString(),
            createdAt: student.createdAt.toISOString(),
        });
    }
    const teachersMissing = await User_1.User.find({
        role: "teacher",
        isActive: true,
        $or: [{ whatsapp: { $exists: false } }, { whatsapp: "" }],
    })
        .select("name email country createdAt")
        .limit(30);
    for (const teacher of teachersMissing) {
        items.push({
            id: `missing-${teacher._id.toString()}`,
            category: "missing_whatsapp",
            title: "Missing WhatsApp number",
            subtitle: teacher.email,
            recipientName: teacher.name,
            recipientRole: "teacher",
            phoneRaw: "",
            phoneDisplay: "Not set",
            phoneValid: false,
            phoneError: "Edit user in Admin → Users and add country code + number.",
            waUrl: null,
            message: "",
            userId: teacher._id.toString(),
            createdAt: teacher.createdAt.toISOString(),
        });
    }
    const classReminders = await (0, classReminderService_1.listRecentClassRemindersForQueue)();
    for (const entry of classReminders) {
        const day = entry.slot.day;
        const portalBase = (0, verificationTokens_1.portalBaseUrl)();
        const pushClassReminder = (user, role, partnerName) => {
            const tz = user.timezone?.trim() || scheduleUtils_1.ACADEMY_TIMEZONE;
            const timeLabel = `${day} ${(0, scheduleUtils_1.formatWeeklyTime)(day, entry.slot.startTime, tz, scheduleUtils_1.ACADEMY_TIMEZONE)}`;
            const message = (0, whatsappMessages_1.classReminderWhatsAppMessage)({
                recipientName: user.name,
                role,
                classTitle: entry.classTitle,
                partnerName,
                timeLabel,
                meetingLink: entry.meetingLink,
                portalUrl: role === "teacher" ? `${portalBase}/teacher` : `${portalBase}/student`,
            });
            const raw = user.whatsapp?.trim() ?? "";
            items.push({
                id: `class-${entry.slot._id.toString()}-${role}-${user._id.toString()}`,
                category: "class_reminder",
                title: entry.reminded ? "Class reminder sent" : "Class starting soon",
                subtitle: `${entry.classTitle} · ${Math.round(entry.minutesUntil)} min`,
                recipientName: user.name,
                recipientRole: role,
                message,
                userId: user._id.toString(),
                ...(raw
                    ? queuePhoneFields(raw, user.country, message)
                    : {
                        phoneRaw: "",
                        phoneDisplay: "Not set",
                        phoneValid: false,
                        phoneError: "Add WhatsApp on user profile.",
                        waUrl: null,
                    }),
            });
        };
        pushClassReminder(entry.teacher, "teacher", entry.student.name);
        pushClassReminder(entry.student, "student", entry.teacher.name);
    }
    const priority = {
        class_reminder: 0,
        payment_overdue: 1,
        payment_due_soon: 2,
        new_trial: 3,
        new_admission: 4,
        missing_whatsapp: 5,
    };
    return items.sort((a, b) => priority[a.category] - priority[b.category]);
}
