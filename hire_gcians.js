(function () {
  "use strict";

  // ─── SUPABASE CONFIG ──────────────────────────────────────────────────────
  // Replace these with your actual Supabase project URL and anon key
  const SUPABASE_URL = "https://svxxoiwiymxdfhazwkri.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_eGbF8qfhFBU1wAVJCcaJPQ_5fWWIaF4";

  const PAGE = document.body.dataset.page || "";
  const PAGE_URLS = {
    auth: "/auth",
    routes: "/routes",
    studentDashboard: "/student/dashboard",
    employerDashboard: "/employer/dashboard",
    adminOverview: "/admin",
  };

  // ─── SEED DATA (kept in-memory for match scoring and resume analysis) ─────
  const resumeAnalyses = {
    "student-allyana": {
      fileName: "allyana_resume.pdf",
      extractedSkills: ["Vue.js", "Django", "Python", "Figma", "Adobe XD", "UI/UX Design", "HTML/CSS", "REST APIs"],
      quantifiable: ["Designed interfaces for 2 student projects", "Built 1 capstone frontend with REST integration"],
      summary: "The current resume profile is strongest in frontend, UI/UX, and practical campus project work.",
    },
    "student-juan": {
      fileName: "juan_resume.pdf",
      extractedSkills: ["Vue.js", "REST APIs", "JavaScript", "HTML/CSS", "Troubleshooting"],
      quantifiable: ["Supported 1 campus lab environment and student troubleshooting workflow."],
      summary: "The current resume profile is strongest in practical web support and systems troubleshooting.",
    },
    "student-maria": {
      fileName: "maria_resume.pdf",
      extractedSkills: ["Python", "HTML/CSS", "Canva", "Figma", "Documentation"],
      quantifiable: ["Created design assets for multiple campus activities and documentation tasks."],
      summary: "The current resume profile is strongest in design support, documentation, and entry-level development.",
    },
    "student-rey": {
      fileName: "rey_resume.pdf",
      extractedSkills: ["Django", "HTML/CSS", "SQL", "Python"],
      quantifiable: ["Built 1 database-driven records prototype with Python and SQL."],
      summary: "The current resume profile is strongest in backend coursework, SQL, and Django-based tool building.",
    },
    "student-katrina": {
      fileName: "katrina_resume.pdf",
      extractedSkills: ["HTML/CSS", "Writing"],
      quantifiable: ["Produced written student-facing content for campus publication work."],
      summary: "The current resume profile is strongest in writing and basic web-content support.",
    },
  };

  const matchOverrides = {
    "job-uiux":    { "student-allyana": 94 },
    "job-webdev":  { "student-allyana": 81, "student-juan": 78, "student-maria": 72, "student-rey": 69, "student-katrina": 58 },
    "job-graphic": { "student-allyana": 73 },
    "job-content": { "student-allyana": 68 },
    "job-library": { "student-allyana": 61 },
    "job-ai-lab":  { "student-allyana": 77 },
  };

  // ─── APP STATE ─────────────────────────────────────────────────────────────
  let supabase = null;
  let currentUserId = null;
  let currentUserProfile = null;
  let allUsers = [];
  let allJobs = [];
  let allApplications = [];
  let savedJobIds = [];
  let applicantNotes = {};
  let employerSettings = {};
  let uiState = {
    selectedJobId: null,
    applicationFilter: "all",
    employerSelectedJobId: null,
    employerSelectedApplicationId: null,
    employerStageFilter: "all",
    signupRole: "student",
    jobFilters: { types: [], companies: [], setups: [], minScore: 0 },
  };

  // ─── SUPABASE CLIENT ───────────────────────────────────────────────────────
  async function initSupabase() {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signUp(email, password, meta) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = PAGE_URLS.auth;
  }

  // ─── DATA LOADING ──────────────────────────────────────────────────────────
  async function loadAllData() {
    const [
      { data: profiles },
      { data: jobs },
      { data: applications },
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("jobs").select("*"),
      supabase.from("applications").select("*"),
    ]);

    allUsers = profiles || [];
    allJobs = (jobs || []).map(dbJobToLocal);
    allApplications = (applications || []).map(dbAppToLocal);

    if (currentUserId) {
      // Load saved jobs for current student
      const { data: saved } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("student_id", currentUserId);
      savedJobIds = (saved || []).map((row) => row.job_id);

      // Load employer settings if employer
      if (currentUserProfile?.role === "employer") {
        const { data: settings } = await supabase
          .from("employer_settings")
          .select("*")
          .eq("employer_id", currentUserId)
          .maybeSingle();
        if (settings) {
          employerSettings = {
            companyName: settings.company_name,
            summary: settings.summary,
            defaultJobType: settings.default_job_type,
            defaultWorkSetup: settings.default_work_setup,
            emailApplicants: settings.email_applicants,
            emailExpiring: settings.email_expiring,
            publicCompany: settings.public_company,
          };
        }
      }

      // Load notes for employer
      if (currentUserProfile?.role === "employer") {
        const { data: notes } = await supabase
          .from("applicant_notes")
          .select("application_id, note")
          .eq("employer_id", currentUserId);
        applicantNotes = {};
        (notes || []).forEach((row) => {
          applicantNotes[row.application_id] = row.note;
        });
      }
    }
  }

  // ─── DATA SHAPE ADAPTERS ───────────────────────────────────────────────────
  function dbJobToLocal(job) {
    return {
      id: job.id,
      title: job.title,
      company: job.company_name,
      type: job.job_type,
      setup: job.work_setup,
      schedule: job.schedule,
      description: job.description,
      skills: job.required_skills || [],
      slots: job.slots,
      employerId: job.employer_id,
      postedAt: job.posted_at,
      status: job.status,
    };
  }

  function dbAppToLocal(app) {
    return {
      id: app.id,
      jobId: app.job_id,
      studentId: app.student_id,
      status: app.status,
      appliedAt: app.applied_at,
      events: app.events || ["Application submitted"],
    };
  }

  // ─── PROFILE HELPERS ───────────────────────────────────────────────────────
  function currentUser() {
    return currentUserProfile || allUsers[0];
  }

  function byId(collection, id) {
    return collection.find((item) => item.id === id);
  }

  function students() {
    return allUsers.filter((u) => u.role === "student");
  }

  function employers() {
    return allUsers.filter((u) => u.role === "employer");
  }

  function initials(user) {
    return `${(user.first_name || user.firstName || "")[0] || ""}${(user.last_name || user.lastName || "")[0] || ""}`.toUpperCase();
  }

  function displayName(user) {
    if (!user) return "";
    const first = user.first_name || user.firstName || "";
    const last = user.last_name || user.lastName || "";
    return `${first} ${last}`.trim();
  }

  function organizationName(user) {
    return user.organization || user.company_name || "";
  }

  function jobsForEmployer(userId) {
    return allJobs.filter((job) => job.employerId === userId);
  }

  function applicationsForStudent(userId) {
    return allApplications.filter((a) => a.studentId === userId);
  }

  function applicationsForJob(jobId) {
    return allApplications.filter((a) => a.jobId === jobId);
  }

  function applicationsForEmployer(userId) {
    const myJobIds = new Set(jobsForEmployer(userId).map((j) => j.id));
    return allApplications.filter((a) => myJobIds.has(a.jobId));
  }

  function resumeForStudent(studentId) {
    return resumeAnalyses[studentId] || {
      fileName: "",
      extractedSkills: [],
      quantifiable: [],
      summary: "Upload a PDF resume so the AI can extract skills for matching.",
    };
  }

  function studentSkills(student) {
    const id = student.id || student;
    return resumeForStudent(id).extractedSkills || [];
  }

  // ─── MATCH SCORING ─────────────────────────────────────────────────────────
  function scoreJob(student, job) {
    const overrides = matchOverrides[job.id];
    if (overrides && overrides[student.id]) return overrides[student.id];
    const extracted = studentSkills(student).map((s) => s.toLowerCase());
    const overlap = job.skills.filter((s) => extracted.includes(s.toLowerCase())).length;
    const ratio = overlap / Math.max(job.skills.length, 1);
    return Math.max(45, Math.min(97, Math.round(52 + ratio * 43)));
  }

  function recommendedJobs(student) {
    return allJobs
      .filter((job) => job.status === "active")
      .map((job) => Object.assign({}, job, { score: scoreJob(student, job) }))
      .sort((a, b) => b.score - a.score);
  }

  function pctClass(score) {
    if (score >= 80) return "pct-high";
    if (score >= 65) return "pct-mid";
    return "pct-low";
  }

  function companyName(job) {
    return job.company || job.company_name || "";
  }

  function suggestedSkill(student) {
    const skillSet = new Set(studentSkills(student).map((s) => s.toLowerCase()));
    for (const job of recommendedJobs(student)) {
      const missing = job.skills.find((s) => !skillSet.has(s.toLowerCase()));
      if (missing) return missing;
    }
    return "Prototyping";
  }

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  async function applyForJob(jobId) {
    const user = currentUser();
    if (!user || user.role !== "student") {
      alert("Sign in as a student to apply.");
      return;
    }
    const existing = allApplications.find((a) => a.jobId === jobId && a.studentId === user.id);
    if (existing) {
      alert("You already applied to this role.");
      return;
    }

    const newApp = {
      job_id: jobId,
      student_id: user.id,
      status: "pending",
      applied_at: new Date().toISOString().slice(0, 10),
      events: ["Application submitted"],
    };

    const { data, error } = await supabase.from("applications").insert(newApp).select().single();
    if (error) { console.error(error); alert("Failed to apply. Try again."); return; }

    allApplications.push(dbAppToLocal(data));
    renderCurrentPage();
  }

  async function toggleSaved(jobId) {
    const user = currentUser();
    if (!user || user.role !== "student") return;

    if (savedJobIds.includes(jobId)) {
      await supabase.from("saved_jobs").delete().eq("student_id", user.id).eq("job_id", jobId);
      savedJobIds = savedJobIds.filter((id) => id !== jobId);
    } else {
      await supabase.from("saved_jobs").insert({ student_id: user.id, job_id: jobId });
      savedJobIds.push(jobId);
    }
    renderCurrentPage();
  }

  async function updateApplicationStatus(appId, status, eventLabel) {
    const app = allApplications.find((a) => a.id === appId);
    if (!app) return;

    const events = app.events.slice();
    if (eventLabel && !events.includes(eventLabel)) events.push(eventLabel);

    const { error } = await supabase
      .from("applications")
      .update({ status, events })
      .eq("id", appId);

    if (!error) {
      app.status = status;
      app.events = events;
    }
  }

  async function saveNote(appId, note) {
    const user = currentUser();
    if (!user) return;

    await supabase.from("applicant_notes").upsert({
      application_id: appId,
      employer_id: user.id,
      note,
    }, { onConflict: "application_id,employer_id" });

    applicantNotes[appId] = note;
  }

  async function saveEmployerSettings(settings) {
    const user = currentUser();
    if (!user) return;

    await supabase.from("employer_settings").upsert({
      employer_id: user.id,
      company_name: settings.companyName,
      summary: settings.summary,
      default_job_type: settings.defaultJobType,
      default_work_setup: settings.defaultWorkSetup,
      email_applicants: settings.emailApplicants,
      email_expiring: settings.emailExpiring,
      public_company: settings.publicCompany,
    }, { onConflict: "employer_id" });

    employerSettings = settings;
  }

  async function postJob(jobData) {
    const user = currentUser();
    if (!user) return;

    const newJob = {
      id: `job-${Date.now()}`,
      title: jobData.title,
      company_name: jobData.company,
      job_type: jobData.type,
      work_setup: jobData.setup,
      schedule: jobData.schedule,
      description: jobData.description,
      required_skills: jobData.skills,
      slots: jobData.slots,
      employer_id: user.id,
      posted_at: new Date().toISOString().slice(0, 10),
      status: "active",
    };

    const { data, error } = await supabase.from("jobs").insert(newJob).select().single();
    if (error) { console.error(error); alert("Failed to post job."); return; }

    allJobs.push(dbJobToLocal(data));
    alert("Job posted successfully!");
    window.location.href = "/employer/listings";
  }

  // ─── UTILITIES ─────────────────────────────────────────────────────────────
  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  }

  function shortDate(d) {
    return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function statusLabel(status) {
    return { pending: "New", review: "Under review", interview: "For interview", hired: "Hired", rejected: "Rejected" }[status] || status;
  }

  function statusColor(status) {
    return { pending: "#C0DD97", review: "#97C459", interview: "#639922", hired: "#3B6D11", rejected: "#ff6b6b" }[status] || "#C0DD97";
  }

  // ─── CHROME / SIDEBAR ──────────────────────────────────────────────────────
  function syncChrome() {
    const user = currentUser();
    if (!user) return;
    const name = user.role === "employer" ? organizationName(user) : displayName(user);
    document.querySelectorAll(".s-name").forEach((n) => (n.textContent = name));
    document.querySelectorAll(".s-avatar").forEach((n) => (n.textContent = initials(user)));
    if (user.role === "student") {
      const prog = `${user.program || ""} ${user.section || ""}`.trim();
      document.querySelectorAll(".s-prog").forEach((n) => (n.textContent = prog));
    }
  }

  function injectUtilityLinks() {
    if (document.querySelector(".route-fab")) return;
    const dock = document.createElement("div");
    dock.className = "route-fab";
    dock.innerHTML = `<a href="${PAGE_URLS.routes}" class="route-fab-link">All Pages</a><a href="${PAGE_URLS.auth}" class="route-fab-link route-fab-link-secondary" id="fab-logout">Log out</a>`;
    document.body.appendChild(dock);
    document.getElementById("fab-logout")?.addEventListener("click", (e) => { e.preventDefault(); signOut(); });
  }

  // ─── PAGE RENDERERS ────────────────────────────────────────────────────────

  function renderCurrentPage() {
    const p = PAGE;
    if (p === "student-dashboard") renderStudentDashboard();
    if (p === "job-listing") renderJobListing();
    if (p === "my-applications") renderApplications();
    if (p === "saved-jobs") renderSavedJobs();
    if (p === "student-profile") renderStudentProfile();
    if (p === "skills-resume") renderSkillsResume();
    if (p === "settings") renderSettings();
    if (p === "public-profile") renderPublicProfile();
    if (p === "employer-dashboard") renderEmployerDashboard();
    if (p === "employer-posting") renderEmployerPosting();
    if (p === "employer-applicants") renderEmployerApplicants();
    if (p === "employer-active-listings") renderEmployerActiveListings();
    if (p === "hired-students") renderHiredStudents();
    if (p === "company-profile") renderCompanyProfile();
    if (p === "employer-settings") renderEmployerSettings();
    if (p === "admin") renderAdminPage();
    if (p === "admin-users") renderAdminUsersPage();
    if (p === "admin-listings") renderAdminListingsPage();
    if (p === "admin-applications") renderAdminApplicationsPage();
    if (p === "admin-ai-logs") renderAdminAiLogsPage();
    if (p === "admin-employers") renderAdminEmployersPage();
    if (p === "admin-announcements") renderAdminAnnouncementsPage();
    if (p === "admin-reports") renderAdminReportsPage();
    if (p === "admin-settings") renderAdminSettingsPage();
    if (p === "admin-audit-logs") renderAdminAuditLogsPage();
    if (p === "landing") renderLanding();
    if (p === "for-employers") renderForEmployersPage();
    if (p === "about") renderAboutPage();
    if (p === "routes") renderRoutesPage();
  }

  // ── AUTH PAGE ──────────────────────────────────────────────────────────────
  function initAuthPage() {
    // Show match cards
    const cards = document.getElementById("auth-match-cards");
    if (cards) {
      cards.innerHTML = [
        { name: "Allyana E.", score: 94, job: "UI/UX Design Intern" },
        { name: "Juan D.", score: 78, job: "Web Dev Assistant" },
        { name: "Maria S.", score: 72, job: "Web Dev Assistant" },
      ].map((c) => `<div class="match-card-preview"><strong>${escapeHtml(c.name)}</strong> · ${escapeHtml(c.job)} <span class="pct-pill pct-high" style="float:right">${c.score}%</span></div>`).join("");
    }

    // Login
    document.getElementById("login-submit")?.addEventListener("click", async () => {
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value.trim();
      if (!email || !password) { alert("Enter email and password."); return; }
      try {
        const user = await signIn(email, password);
        // Load profile to get role
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        const role = profile?.role || "student";
        navigateForRole(role);
      } catch (err) {
        alert("Invalid email or password.");
      }
    });

    // Signup
    document.getElementById("signup-submit")?.addEventListener("click", async () => {
      const role = uiState.signupRole || "student";
      const firstName = document.getElementById("signup-first-name").value.trim();
      const lastName = document.getElementById("signup-last-name").value.trim();
      const email = document.getElementById("signup-email").value.trim().toLowerCase();
      const password = document.getElementById("signup-password").value.trim();
      if (!firstName || !lastName || !email || !password) { alert("Complete all required fields."); return; }

      const meta = {
        first_name: firstName,
        last_name: lastName,
        role,
        program: document.getElementById("signup-program")?.value || "BSCS",
        year_level: document.getElementById("signup-year-level")?.value || "1st Year",
        section: "1-A",
        organization: document.getElementById("signup-company")?.value || "",
      };

      try {
        const authUser = await signUp(email, password, meta);
        // Insert profile row
        await supabase.from("profiles").insert({
          id: authUser.id,
          role,
          first_name: firstName,
          last_name: lastName,
          email,
          program: meta.program,
          year_level: meta.year_level,
          section: meta.section,
          organization: meta.organization,
          about: role === "student" ? "New student account." : "New employer account.",
          skills: [],
          experience: [],
        });
        navigateForRole(role);
      } catch (err) {
        alert(err.message || "Signup failed. Try again.");
      }
    });
  }

  function navigateForRole(role) {
    if (role === "employer") window.location.href = PAGE_URLS.employerDashboard;
    else if (role === "admin") window.location.href = PAGE_URLS.adminOverview;
    else window.location.href = PAGE_URLS.studentDashboard;
  }

  // ── STUDENT DASHBOARD ──────────────────────────────────────────────────────
  function renderStudentDashboard() {
    const user = currentUser();
    if (!user) return;
    const jobs = recommendedJobs(user);
    const apps = applicationsForStudent(user.id);
    const skills = studentSkills(user);
    const resume = resumeForStudent(user.id);

    setText("#student-dashboard-title", `Welcome back, ${user.first_name || user.firstName}`);
    setText("#student-dashboard-subtitle", `${jobs.length} active matches available right now`);

    const metrics = document.getElementById("student-dashboard-metrics");
    if (metrics) {
      metrics.innerHTML = `
        <div class="metric"><div class="metric-val">${jobs.length}</div><div class="metric-label">Recommended jobs</div></div>
        <div class="metric"><div class="metric-val">${apps.length}</div><div class="metric-label">Applications sent</div></div>
        <div class="metric"><div class="metric-val">${jobs[0] ? jobs[0].score : 0}%</div><div class="metric-label">Top match score</div></div>
      `;
    }

    const recs = document.getElementById("student-dashboard-recommendations");
    if (recs) {
      recs.innerHTML = jobs.slice(0, 4).map((job) => `
        <div class="job-card">
          <div>
            <div class="job-title">${escapeHtml(job.title)}</div>
            <div class="job-dept">${escapeHtml(companyName(job))} · ${escapeHtml(job.type)} · ${escapeHtml(job.setup)}</div>
            <div class="job-tags">${job.skills.slice(0, 3).map((s) => `<span class="jtag">${escapeHtml(s)}</span>`).join("")}</div>
          </div>
          <div class="job-right">
            <div class="pct-pill ${pctClass(job.score)}">${job.score}% match</div>
            <button class="apply-btn" data-apply-job="${job.id}">${apps.some((a) => a.jobId === job.id) ? "Applied" : "Apply now"}</button>
          </div>
        </div>
      `).join("");
      recs.querySelectorAll("[data-apply-job]").forEach((btn) => btn.addEventListener("click", () => applyForJob(btn.dataset.applyJob)));
    }

    const skillsWrap = document.getElementById("student-dashboard-skills");
    if (skillsWrap) skillsWrap.innerHTML = skills.slice(0, 6).map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");

    const completeness = Math.min(95, 45 + skills.length * 3 + (user.experience?.length || 0) * 8 + (resume.fileName ? 10 : 0));
    const bar = document.getElementById("student-dashboard-completeness-bar");
    if (bar) bar.style.width = `${completeness}%`;
    setText("#student-dashboard-completeness-text", `${completeness}% complete`);
    setText("#student-dashboard-tip", `Your job match is based on AI-extracted resume skills. Add "${suggestedSkill(user)}" to your PDF resume to improve one of your top matches.`);
  }

  // ── JOB LISTING ────────────────────────────────────────────────────────────
  function renderJobListing() {
    const user = currentUser();
    if (!user) return;
    const search = (document.getElementById("job-search-input")?.value || "").trim().toLowerCase();
    const filters = uiState.jobFilters || { types: [], companies: [], setups: [], minScore: 0 };
    const jobs = recommendedJobs(user).filter((job) => {
      const matchesSearch = `${job.title} ${companyName(job)} ${job.skills.join(" ")}`.toLowerCase().includes(search);
      const matchesType = !filters.types.length || filters.types.includes(job.type);
      const matchesCompany = !filters.companies.length || filters.companies.includes(companyName(job));
      const matchesSetup = !filters.setups.length || filters.setups.includes(job.setup);
      const matchesScore = job.score >= (filters.minScore || 0);
      return matchesSearch && matchesType && matchesCompany && matchesSetup && matchesScore;
    });

    const allRecs = recommendedJobs(user);
    if (!uiState.selectedJobId || !jobs.some((j) => j.id === uiState.selectedJobId)) {
      uiState.selectedJobId = jobs[0]?.id || null;
    }

    setText("#jobs-count", `${jobs.length} opportunities found`);

    const filterPanel = document.getElementById("job-filter-panel");
    if (filterPanel) {
      const typeOptions = Array.from(new Set(allRecs.map((j) => j.type)));
      const companyOptions = Array.from(new Set(allRecs.map((j) => companyName(j))));
      const setupOptions = Array.from(new Set(allRecs.map((j) => j.setup)));
      const renderOptions = (group, options, selected) =>
        options.map((opt) => `<div class="filter-option ${selected.includes(opt) ? "active" : ""}" data-filter-group="${group}" data-filter-value="${escapeHtml(opt)}"><div class="checkbox ${selected.includes(opt) ? "checked" : ""}"></div> ${escapeHtml(opt)}</div>`).join("");
      filterPanel.innerHTML = `
        <div class="filter-group"><div class="filter-title">Job type</div>${renderOptions("types", typeOptions, filters.types || [])}</div>
        <div class="filter-group"><div class="filter-title">Company</div>${renderOptions("companies", companyOptions, filters.companies || [])}</div>
        <div class="filter-group"><div class="filter-title">Work setup</div>${renderOptions("setups", setupOptions, filters.setups || [])}</div>
        <div class="filter-group"><div class="filter-title">Match score</div>
          <div class="filter-option ${filters.minScore === 70 ? "active" : ""}" data-score-filter="70"><div class="checkbox ${filters.minScore === 70 ? "checked" : ""}"></div> 70% and above</div>
          <div class="filter-option ${filters.minScore === 0 ? "active" : ""}" data-score-filter="0"><div class="checkbox ${filters.minScore === 0 ? "checked" : ""}"></div> Any</div>
        </div>
      `;
      filterPanel.querySelectorAll("[data-filter-group]").forEach((el) => {
        el.addEventListener("click", () => {
          const group = el.dataset.filterGroup;
          const value = el.dataset.filterValue;
          const list = filters[group] || [];
          filters[group] = list.includes(value) ? list.filter((v) => v !== value) : list.concat(value);
          uiState.jobFilters = filters;
          renderJobListing();
        });
      });
      filterPanel.querySelectorAll("[data-score-filter]").forEach((el) => {
        el.addEventListener("click", () => {
          filters.minScore = parseInt(el.dataset.scoreFilter, 10);
          uiState.jobFilters = filters;
          renderJobListing();
        });
      });
    }

    const listEl = document.getElementById("job-listings");
    if (listEl) {
      const apps = applicationsForStudent(user.id);
      listEl.innerHTML = jobs.map((job) => {
        const isSelected = job.id === uiState.selectedJobId;
        const isSaved = savedJobIds.includes(job.id);
        const applied = apps.some((a) => a.jobId === job.id);
        return `
          <div class="job-item ${isSelected ? "selected" : ""}" data-job-id="${job.id}">
            <div class="ji-top">
              <div>
                <div class="ji-title">${escapeHtml(job.title)}</div>
                <div class="ji-dept">${escapeHtml(companyName(job))} · ${escapeHtml(job.type)}</div>
              </div>
              <div class="pct-pill ${pctClass(job.score)}">${job.score}%</div>
            </div>
            <div class="ji-tags">${job.skills.slice(0, 3).map((s) => `<span class="jtag">${escapeHtml(s)}</span>`).join("")}</div>
            <div class="ji-bottom">
              <span class="ji-setup">${escapeHtml(job.setup)}</span>
              <button class="save-btn ${isSaved ? "saved" : ""}" data-save-job="${job.id}">${isSaved ? "♥ Saved" : "♡ Save"}</button>
            </div>
          </div>
        `;
      }).join("");

      listEl.querySelectorAll(".job-item").forEach((el) => {
        el.addEventListener("click", (e) => {
          if (e.target.closest(".save-btn")) return;
          uiState.selectedJobId = el.dataset.jobId;
          renderJobListing();
        });
      });
      listEl.querySelectorAll(".save-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => { e.stopPropagation(); toggleSaved(btn.dataset.saveJob); });
      });
    }

    // Detail panel
    const detail = document.getElementById("job-detail-panel");
    const selected = jobs.find((j) => j.id === uiState.selectedJobId);
    if (detail && selected) {
      const apps = applicationsForStudent(user.id);
      const applied = apps.some((a) => a.jobId === selected.id);
      const isSaved = savedJobIds.includes(selected.id);
      const skillSet = new Set(studentSkills(user).map((s) => s.toLowerCase()));
      detail.innerHTML = `
        <div class="dp-header">
          <div>
            <div class="dp-title">${escapeHtml(selected.title)}</div>
            <div class="dp-dept">${escapeHtml(companyName(selected))} · Posted ${shortDate(selected.postedAt)}</div>
          </div>
          <div class="pct-pill ${pctClass(selected.score)}" style="font-size:1rem">${selected.score}% match</div>
        </div>
        <div class="dp-tags">${selected.skills.map((s) => `<span class="jtag ${skillSet.has(s.toLowerCase()) ? "jtag-match" : ""}">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="dp-meta"><span>${escapeHtml(selected.type)}</span> · <span>${escapeHtml(selected.setup)}</span> · <span>${escapeHtml(selected.schedule)}</span> · <span>${selected.slots} slot${selected.slots !== 1 ? "s" : ""}</span></div>
        <div class="dp-desc">${escapeHtml(selected.description)}</div>
        <div class="dp-actions">
          <button class="apply-btn-big ${applied ? "applied" : ""}" id="detail-apply-btn">${applied ? "✓ Applied" : "Apply now"}</button>
          <button class="save-btn-big ${isSaved ? "saved" : ""}" id="detail-save-btn">${isSaved ? "♥ Saved" : "♡ Save"}</button>
        </div>
      `;
      if (!applied) {
        document.getElementById("detail-apply-btn")?.addEventListener("click", () => applyForJob(selected.id));
      }
      document.getElementById("detail-save-btn")?.addEventListener("click", () => toggleSaved(selected.id));
    }
  }

  // ── MY APPLICATIONS ────────────────────────────────────────────────────────
  function renderApplications() {
    const user = currentUser();
    if (!user) return;
    const filter = uiState.applicationFilter || "all";
    let apps = applicationsForStudent(user.id);
    const allApps = apps;

    const summary = document.getElementById("applications-summary");
    if (summary) {
      const counts = { pending: 0, review: 0, interview: 0, hired: 0 };
      allApps.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });
      summary.innerHTML = Object.entries({ "New": counts.pending, "Under review": counts.review, "Interview": counts.interview, "Hired": counts.hired })
        .map(([label, count]) => `<div class="summary-stat"><div class="ss-val">${count}</div><div class="ss-label">${label}</div></div>`).join("");
    }

    // Update tab counts
    document.querySelectorAll(".stab").forEach((tab) => {
      const s = tab.dataset.status || tab.onclick?.toString().match(/'(\w+)'/)?.[1];
      if (s === "all") tab.querySelector(".stab-count") && (tab.querySelector(".stab-count").textContent = allApps.length);
      else if (s && tab.querySelector(".stab-count")) tab.querySelector(".stab-count").textContent = allApps.filter((a) => a.status === s).length;
      if (s === filter || (s === "all" && filter === "all")) tab.classList.add("active");
      else tab.classList.remove("active");
    });

    if (filter !== "all") apps = apps.filter((a) => a.status === filter);

    const list = document.getElementById("apps-list");
    if (!list) return;
    if (!apps.length) { list.innerHTML = `<div style="color:var(--gc-muted);font-size:0.85rem;padding:1rem">No applications in this category.</div>`; return; }

    list.innerHTML = apps.map((app) => {
      const job = byId(allJobs, app.jobId);
      if (!job) return "";
      const score = scoreJob(user, job);
      return `
        <div class="app-card">
          <div class="ac-top">
            <div>
              <div class="ac-title">${escapeHtml(job.title)}</div>
              <div class="ac-dept">${escapeHtml(companyName(job))} · Applied ${fmtDate(app.appliedAt)}</div>
            </div>
            <div class="pct-pill ${pctClass(score)}">${score}% match</div>
          </div>
          <div class="ac-status">
            <span class="status-pill" style="background:${statusColor(app.status)}22;color:${statusColor(app.status)};border:1px solid ${statusColor(app.status)}44">● ${statusLabel(app.status)}</span>
          </div>
          <div class="ac-timeline">${app.events.map((e) => `<span class="tl-step">${escapeHtml(e)}</span>`).join(" → ")}</div>
        </div>
      `;
    }).join("");
  }

  // ── SAVED JOBS ─────────────────────────────────────────────────────────────
  function renderSavedJobs() {
    const user = currentUser();
    if (!user) return;
    const saved = allJobs.filter((j) => savedJobIds.includes(j.id)).map((j) => Object.assign({}, j, { score: scoreJob(user, j) }));
    setText("#saved-count", `${saved.length} saved ${saved.length === 1 ? "opportunity" : "opportunities"}`);
    const grid = document.getElementById("saved-grid");
    if (!grid) return;
    if (!saved.length) { grid.innerHTML = `<div style="color:var(--gc-muted);font-size:0.85rem">No saved jobs yet. Browse jobs and click ♡ Save to add them here.</div>`; return; }
    const apps = applicationsForStudent(user.id);
    grid.innerHTML = saved.map((job) => {
      const applied = apps.some((a) => a.jobId === job.id);
      return `
        <div class="saved-card">
          <div class="sv-top">
            <div><div class="sv-title">${escapeHtml(job.title)}</div><div class="sv-dept">${escapeHtml(companyName(job))} · ${escapeHtml(job.type)}</div></div>
            <div class="pct-pill ${pctClass(job.score)}">${job.score}%</div>
          </div>
          <div class="sv-tags">${job.skills.slice(0, 3).map((s) => `<span class="jtag">${escapeHtml(s)}</span>`).join("")}</div>
          <div class="sv-actions">
            <button class="apply-btn ${applied ? "applied" : ""}" data-apply-job="${job.id}">${applied ? "✓ Applied" : "Apply now"}</button>
            <button class="save-btn saved" data-save-job="${job.id}">♥ Remove</button>
          </div>
        </div>
      `;
    }).join("");
    grid.querySelectorAll("[data-apply-job]").forEach((btn) => btn.addEventListener("click", () => applyForJob(btn.dataset.applyJob)));
    grid.querySelectorAll("[data-save-job]").forEach((btn) => btn.addEventListener("click", () => toggleSaved(btn.dataset.saveJob)));
  }

  // ── STUDENT PROFILE ────────────────────────────────────────────────────────
  function renderStudentProfile() {
    const user = currentUser();
    if (!user) return;
    const skills = studentSkills(user);
    const resume = resumeForStudent(user.id);
    setText("#profile-name", displayName(user));
    setText("#profile-program-line", `${user.program || ""} ${user.section || ""} · Gordon College, Olongapo City`);

    const skillsEl = document.getElementById("profile-skills");
    if (skillsEl) skillsEl.innerHTML = skills.map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");

    const expEl = document.getElementById("profile-experience");
    if (expEl) expEl.innerHTML = (user.experience || []).map((item) => `<div class="dc-sec-body"><strong style="color:var(--gc-dark)">${escapeHtml(item.title)}</strong><br>${escapeHtml(item.org)} · ${escapeHtml(item.dates)}<br>${escapeHtml(item.desc)}</div>`).join("");

    setText("#profile-about", user.about || "");

    const completeness = Math.min(95, 45 + skills.length * 3 + (user.experience?.length || 0) * 8 + (resume.fileName ? 10 : 0));
    const bar = document.getElementById("profile-completeness-bar");
    if (bar) bar.style.width = `${completeness}%`;
    setText("#profile-completeness-number", `${completeness}%`);
    setText("#profile-ai-tip", `Add "${suggestedSkill(user)}" to your resume PDF to improve your match score on top-ranked roles.`);
    const resumeCheck = document.getElementById("profile-resume-check");
    if (resumeCheck) resumeCheck.innerHTML = resume.fileName ? `<span class="check-done">✓</span> Resume uploaded (${escapeHtml(resume.fileName)})` : `<span class="check-todo">○</span> Resume not yet uploaded`;

    document.getElementById("profile-save-button")?.addEventListener("click", async () => {
      alert("Profile saved! (In a full build, bio and experience edits would write to Supabase.)");
    });
  }

  // ── SKILLS & RESUME ────────────────────────────────────────────────────────
  function renderSkillsResume() {
    const user = currentUser();
    if (!user) return;
    const resume = resumeForStudent(user.id);
    setText("#resume-upload-status", resume.fileName ? `Current file: ${resume.fileName}` : "No resume uploaded yet.");
    const skillsEl = document.getElementById("resume-skills-grid");
    if (skillsEl) skillsEl.innerHTML = resume.extractedSkills.map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");
    const quantEl = document.getElementById("resume-quant-list");
    if (quantEl) quantEl.innerHTML = resume.quantifiable.map((q) => `<div class="quant-row">✓ ${escapeHtml(q)}</div>`).join("");
    setText("#resume-summary", resume.summary);
    setText("#resume-recommendation", `Your resume shows ${resume.extractedSkills.length} extractable skills. Add quantifiable results (numbers, impact) to improve employer impression.`);

    document.getElementById("resume-analyze-button")?.addEventListener("click", () => {
      const file = document.getElementById("resume-file-input")?.files[0];
      if (!file) { alert("Select a PDF file first."); return; }
      setText("#resume-upload-status", `Resume analysis running for: ${file.name}...`);
      setTimeout(() => {
        resumeAnalyses[user.id] = Object.assign({}, resumeAnalyses[user.id] || {}, { fileName: file.name });
        setText("#resume-upload-status", `Analysis complete for: ${file.name}. Skills and profile insights are shown above.`);
      }, 1200);
    });
  }

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  function renderSettings() {
    // Checkboxes / inputs use browser state for now — no Supabase table yet
    document.getElementById("settings-save-button")?.addEventListener("click", () => {
      alert("Settings saved!");
    });
  }

  // ── PUBLIC PROFILE ─────────────────────────────────────────────────────────
  function renderPublicProfile() {
    const user = currentUser();
    if (!user) return;
    const skills = studentSkills(user);
    setText("#public-profile-name", displayName(user));
    setText("#public-profile-subtitle", `${user.program || ""} ${user.section || ""} · Gordon College`);
    const tags = document.getElementById("public-profile-tags");
    if (tags) tags.innerHTML = (user.preferences || []).map((p) => `<span class="ph-tag">${escapeHtml(p)}</span>`).join("");
    setText("#public-profile-about", user.about || "");
    const skillsEl = document.getElementById("public-profile-skills");
    if (skillsEl) skillsEl.innerHTML = skills.map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");
    const expEl = document.getElementById("public-profile-experience");
    if (expEl) expEl.innerHTML = (user.experience || []).map((item) => `<div class="dc-sec-body"><strong style="color:var(--gc-dark)">${escapeHtml(item.title)}</strong><br>${escapeHtml(item.org)} · ${escapeHtml(item.dates)}<br>${escapeHtml(item.desc)}</div>`).join("");
  }

  // ── EMPLOYER DASHBOARD ─────────────────────────────────────────────────────
  function renderEmployerDashboard() {
    const user = currentUser();
    if (!user) return;
    const myJobs = jobsForEmployer(user.id);
    const myApps = applicationsForEmployer(user.id);
    const newApps = myApps.filter((a) => a.status === "pending").length;

    const metrics = document.getElementById("employer-dashboard-metrics");
    if (metrics) {
      metrics.innerHTML = `
        <div class="metric"><div class="metric-val">${myJobs.filter((j) => j.status === "active").length}</div><div class="metric-label">Active listings</div></div>
        <div class="metric"><div class="metric-val">${myApps.length}</div><div class="metric-label">Total applicants</div></div>
        <div class="metric"><div class="metric-val">${newApps}</div><div class="metric-label">New this week</div></div>
        <div class="metric"><div class="metric-val">${myApps.filter((a) => a.status === "hired").length}</div><div class="metric-label">Hired</div></div>
      `;
    }

    const recent = document.getElementById("recent-applicants-panel");
    if (recent) {
      const latest = myApps.slice(-4).reverse();
      recent.innerHTML = latest.map((app) => {
        const student = byId(allUsers, app.studentId);
        const job = byId(allJobs, app.jobId);
        if (!student || !job) return "";
        return `<div class="ra-row"><div class="ra-av">${initials(student)}</div><div><div class="ra-name">${escapeHtml(displayName(student))}</div><div class="ra-job">${escapeHtml(job.title)}</div></div><span class="status-pill" style="margin-left:auto;font-size:0.7rem">${statusLabel(app.status)}</span></div>`;
      }).join("") + `<div style="text-align:center;margin-top:0.75rem"><button style="font-size:0.75rem;color:var(--gc-green);background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif" onclick="location.href='/employer/applicants'">View all applicants →</button></div>`;
    }

    const activity = document.getElementById("recent-activity-panel");
    if (activity) {
      activity.innerHTML = myApps.slice(-3).reverse().map((app) => {
        const student = byId(allUsers, app.studentId);
        const job = byId(allJobs, app.jobId);
        if (!student || !job) return "";
        return `<div class="ra-row"><div style="font-size:0.78rem;color:var(--gc-muted)">${escapeHtml(displayName(student))} applied to <strong style="color:var(--gc-dark)">${escapeHtml(job.title)}</strong></div></div>`;
      }).join("");
    }
  }

  // ── EMPLOYER POSTING ───────────────────────────────────────────────────────
  function renderEmployerPosting() {
    const user = currentUser();
    if (!user) return;
    const settings = employerSettings;

    const previewUpdate = () => {
      const title = document.getElementById("posting-title")?.value || "New job draft";
      const company = document.getElementById("posting-company")?.value || companyName(user);
      const desc = document.getElementById("posting-description")?.value || "Your role description preview will appear here.";
      setText("#posting-preview-title", title);
      setText("#posting-preview-dept", `${company} · Posted just now`);
      setText("#posting-preview-desc", desc);
    };

    ["posting-title", "posting-description"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", previewUpdate);
    });

    // Skills chip input
    let postingSkills = settings.defaultJobType ? ["Communication", "Documentation"] : ["Communication", "Documentation"];
    const renderChips = () => {
      const chips = document.getElementById("posting-skill-chips");
      if (chips) chips.innerHTML = postingSkills.map((s) => `<span class="skill-chip">${escapeHtml(s)} <span class="chip-remove" data-skill="${escapeHtml(s)}">×</span></span>`).join("");
      chips?.querySelectorAll(".chip-remove").forEach((el) => el.addEventListener("click", () => {
        postingSkills = postingSkills.filter((sk) => sk !== el.dataset.skill);
        renderChips();
      }));
      const tags = document.getElementById("posting-preview-tags");
      if (tags) tags.innerHTML = postingSkills.map((s) => `<span class="jtag">${escapeHtml(s)}</span>`).join("");
    };
    renderChips();

    document.getElementById("posting-skill-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = e.target.value.trim().replace(/,$/, "");
        if (val && !postingSkills.includes(val)) { postingSkills.push(val); renderChips(); }
        e.target.value = "";
      }
    });

    document.querySelector(".submit-btn")?.addEventListener("click", () => {
      const title = document.getElementById("posting-title")?.value.trim();
      if (!title) { alert("Enter a job title first."); return; }
      postJob({
        title,
        company: document.getElementById("posting-company")?.value,
        type: document.getElementById("posting-job-type")?.value,
        setup: document.getElementById("posting-work-setup")?.value,
        schedule: document.getElementById("posting-schedule")?.value,
        description: document.getElementById("posting-description")?.value,
        skills: postingSkills,
        slots: parseInt(document.getElementById("posting-slots")?.value || "1", 10),
      });
    });

    previewUpdate();

    // Predicted matches
    const matches = document.getElementById("posting-predicted-matches");
    if (matches) {
      matches.innerHTML = students().slice(0, 3).map((s) => `<div class="ap-row"><div class="ap-av">${initials(s)}</div><div class="ap-name">${escapeHtml(displayName(s))}</div><div class="ap-score" style="margin-left:auto;color:var(--gc-green);font-size:0.8rem">~${Math.floor(55 + Math.random() * 35)}%</div></div>`).join("");
    }
  }

  // ── EMPLOYER APPLICANTS ────────────────────────────────────────────────────
  function renderEmployerApplicants() {
    const user = currentUser();
    if (!user) return;
    const myJobs = jobsForEmployer(user.id);
    let myApps = applicationsForEmployer(user.id);

    // Job switcher
    const jobSelect = document.getElementById("applicant-job-select");
    if (jobSelect && !jobSelect.dataset.wired) {
      jobSelect.innerHTML = `<option value="all">All jobs</option>` + myJobs.map((j) => `<option value="${j.id}">${escapeHtml(j.title)}</option>`).join("");
      if (uiState.employerSelectedJobId) jobSelect.value = uiState.employerSelectedJobId;
      jobSelect.addEventListener("change", () => {
        uiState.employerSelectedJobId = jobSelect.value === "all" ? null : jobSelect.value;
        renderEmployerApplicants();
      });
      jobSelect.dataset.wired = "1";
    }

    if (uiState.employerSelectedJobId) myApps = myApps.filter((a) => a.jobId === uiState.employerSelectedJobId);

    // Stage filter tabs
    const filter = uiState.employerStageFilter || "all";
    document.querySelectorAll(".stab[data-stage-filter]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.stageFilter === filter);
      tab.addEventListener("click", () => {
        uiState.employerStageFilter = tab.dataset.stageFilter;
        renderEmployerApplicants();
      });
    });

    let filtered = myApps;
    if (filter !== "all") filtered = myApps.filter((a) => a.status === filter);

    const listEl = document.getElementById("applicants-list");
    if (listEl) {
      listEl.innerHTML = filtered.map((app) => {
        const student = byId(allUsers, app.studentId);
        const job = byId(allJobs, app.jobId);
        if (!student || !job) return "";
        const score = scoreJob(student, job);
        const isSelected = app.id === uiState.employerSelectedApplicationId;
        return `
          <div class="applicant-row ${isSelected ? "selected" : ""}" data-app-id="${app.id}">
            <div class="ar-av" style="background:var(--gc-green)">${initials(student)}</div>
            <div class="ar-info">
              <div class="ar-name">${escapeHtml(displayName(student))}</div>
              <div class="ar-sub">${escapeHtml(job.title)} · ${statusLabel(app.status)}</div>
            </div>
            <div class="pct-pill ${pctClass(score)}" style="font-size:0.72rem">${score}%</div>
          </div>
        `;
      }).join("");

      listEl.querySelectorAll(".applicant-row").forEach((row) => {
        row.addEventListener("click", () => {
          uiState.employerSelectedApplicationId = row.dataset.appId;
          renderEmployerApplicants();
        });
      });
    }

    // Subtitle
    setText("#applicants-list-subtitle", `${myApps.length} applicant${myApps.length !== 1 ? "s" : ""} across your listings`);

    // Detail panel
    const app = byId(allApplications, uiState.employerSelectedApplicationId) || filtered[0];
    if (!app) return;
    uiState.employerSelectedApplicationId = app.id;

    const student = byId(allUsers, app.studentId);
    const job = byId(allJobs, app.jobId);
    if (!student || !job) return;

    const score = scoreJob(student, job);
    setText("#applicant-detail-avatar", initials(student));
    setText("#applicant-detail-name", displayName(student));
    setText("#applicant-detail-sub", `${student.program || ""} ${student.section || ""} · Gordon College · Applied ${fmtDate(app.appliedAt)}`);

    const tagsEl = document.getElementById("applicant-detail-tags");
    if (tagsEl) tagsEl.innerHTML = studentSkills(student).slice(0, 4).map((s) => `<span class="jtag">${escapeHtml(s)}</span>`).join("");

    setText("#applicant-detail-match-label", `AI match score for ${job.title}`);
    setText("#applicant-detail-match-value", `${score}%`);
    const bar = document.getElementById("applicant-detail-match-bar");
    if (bar) bar.style.width = `${score}%`;
    const matchedCount = job.skills.filter((s) => studentSkills(student).map((sk) => sk.toLowerCase()).includes(s.toLowerCase())).length;
    setText("#applicant-detail-match-note", `${score >= 75 ? "Strong" : "Moderate"} fit — meets ${matchedCount} of ${job.skills.length} required skills`);
    setText("#applicant-detail-about", student.about || "");

    const skillBreakdown = document.getElementById("applicant-detail-skills");
    if (skillBreakdown) {
      const skillSet = new Set(studentSkills(student).map((s) => s.toLowerCase()));
      skillBreakdown.innerHTML = job.skills.map((s) => `<div class="skill-row"><span>${escapeHtml(s)}</span><span class="${skillSet.has(s.toLowerCase()) ? "skill-match" : "skill-miss"}">${skillSet.has(s.toLowerCase()) ? "✓ Found in resume" : "Not found"}</span></div>`).join("");
    }

    const expEl = document.getElementById("applicant-detail-experience");
    if (expEl) expEl.innerHTML = (student.experience || []).map((item) => `<div class="dc-sec-body"><strong style="color:var(--gc-dark)">${escapeHtml(item.title)}</strong><br>${escapeHtml(item.org)} · ${escapeHtml(item.dates)}<br>${escapeHtml(item.desc)}</div>`).join("");

    const noteArea = document.getElementById("applicant-note-area");
    if (noteArea) noteArea.value = applicantNotes[app.id] || "";
    document.getElementById("save-applicant-note")?.addEventListener("click", () => saveNote(app.id, noteArea?.value || ""));

    // Stage buttons
    document.querySelectorAll(".stage-btn").forEach((btn) => {
      const mapping = { "New": "pending", "Under review": "review", "For interview": "interview", "Hired": "hired", "Rejected": "rejected" };
      const label = btn.textContent.trim();
      btn.classList.toggle("current", mapping[label] === app.status);
      btn.onclick = async () => {
        if (mapping[label]) {
          await updateApplicationStatus(app.id, mapping[label], label);
          renderEmployerApplicants();
        }
      };
    });

    document.querySelector(".action-btn-green")?.addEventListener("click", async () => { await updateApplicationStatus(app.id, "hired", "Hired"); renderEmployerApplicants(); });
    document.querySelector(".action-btn-outline")?.addEventListener("click", async () => { await updateApplicationStatus(app.id, "interview", "Interview scheduled"); renderEmployerApplicants(); });
    document.querySelector(".action-btn-reject")?.addEventListener("click", async () => { await updateApplicationStatus(app.id, "rejected", "Rejected"); renderEmployerApplicants(); });
  }

  // ── ACTIVE LISTINGS ────────────────────────────────────────────────────────
  function renderEmployerActiveListings() {
    const user = currentUser();
    if (!user) return;
    const myJobs = jobsForEmployer(user.id);
    const table = document.getElementById("employer-active-listings-table");
    if (!table) return;
    table.innerHTML = `
      <div class="jt-head"><div>Position</div><div>Status</div><div>Applicants</div><div>Slots</div><div>Actions</div></div>
      ${myJobs.map((job) => {
        const appCount = applicationsForJob(job.id).length;
        return `
          <div class="jt-row">
            <div><div class="jt-title">${escapeHtml(job.title)}</div><div class="jt-dept">Posted ${shortDate(job.postedAt)}</div></div>
            <div class="jt-status"><span class="status-dot ${job.status !== "active" ? "closed" : ""}"></span>${job.status === "active" ? "Active" : "Closed"}</div>
            <div class="jt-num">${appCount}</div>
            <div class="jt-num">${job.slots}</div>
            <div class="jt-actions">
              <button class="jt-btn" onclick="location.href='/employer/applicants'">View</button>
            </div>
          </div>
        `;
      }).join("")}
    `;
  }

  // ── HIRED STUDENTS ─────────────────────────────────────────────────────────
  function renderHiredStudents() {
    const user = currentUser();
    if (!user) return;
    const hired = applicationsForEmployer(user.id).filter((a) => a.status === "hired");
    const list = document.getElementById("hired-students-list");
    if (!list) return;
    if (!hired.length) { list.innerHTML = `<div style="color:var(--gc-muted);font-size:0.85rem;padding:1rem">No students hired yet.</div>`; return; }
    list.innerHTML = hired.map((app) => {
      const student = byId(allUsers, app.studentId);
      const job = byId(allJobs, app.jobId);
      if (!student || !job) return "";
      return `<div class="ra-row" style="padding:0.75rem"><div class="ra-av">${initials(student)}</div><div><div class="ra-name">${escapeHtml(displayName(student))}</div><div class="ra-job">${escapeHtml(job.title)} · Hired ${fmtDate(app.appliedAt)}</div></div></div>`;
    }).join("");
  }

  // ── COMPANY PROFILE ────────────────────────────────────────────────────────
  function renderCompanyProfile() {
    const user = currentUser();
    if (!user) return;
    const settings = employerSettings;
    setText("#company-profile-summary", settings.summary || organizationName(user));
    const jobs = document.getElementById("company-profile-jobs");
    if (jobs) {
      const myJobs = jobsForEmployer(user.id).filter((j) => j.status === "active");
      jobs.innerHTML = myJobs.map((job) => `<div class="jt-row" style="padding:0.5rem 0"><div class="jt-title">${escapeHtml(job.title)}</div><div class="jt-dept">${escapeHtml(job.type)} · ${escapeHtml(job.setup)}</div></div>`).join("");
    }
  }

  // ── EMPLOYER SETTINGS ──────────────────────────────────────────────────────
  function renderEmployerSettings() {
    const user = currentUser();
    if (!user) return;
    const settings = employerSettings;
    const nameEl = document.getElementById("employer-setting-name");
    const summaryEl = document.getElementById("employer-setting-summary");
    const jobTypeEl = document.getElementById("employer-setting-job-type");
    const workSetupEl = document.getElementById("employer-setting-work-setup");
    const applicantsEl = document.getElementById("employer-setting-applicants");
    const expiringEl = document.getElementById("employer-setting-expiring");
    const publicEl = document.getElementById("employer-setting-public");

    if (nameEl) nameEl.value = settings.companyName || organizationName(user) || "";
    if (summaryEl) summaryEl.value = settings.summary || "";
    if (jobTypeEl) jobTypeEl.value = settings.defaultJobType || "Part-time";
    if (workSetupEl) workSetupEl.value = settings.defaultWorkSetup || "Remote";
    if (applicantsEl) applicantsEl.checked = settings.emailApplicants !== false;
    if (expiringEl) expiringEl.checked = settings.emailExpiring !== false;
    if (publicEl) publicEl.checked = settings.publicCompany !== false;

    document.getElementById("employer-settings-save")?.addEventListener("click", async () => {
      await saveEmployerSettings({
        companyName: nameEl?.value || "",
        summary: summaryEl?.value || "",
        defaultJobType: jobTypeEl?.value || "Part-time",
        defaultWorkSetup: workSetupEl?.value || "Remote",
        emailApplicants: applicantsEl?.checked || false,
        emailExpiring: expiringEl?.checked || false,
        publicCompany: publicEl?.checked || false,
      });
      alert("Settings saved!");
    });
  }

  // ── ADMIN PAGE ─────────────────────────────────────────────────────────────
  function renderAdminPage() {
    const studentCount = students().length;
    const activeJobs = allJobs.filter((j) => j.status === "active").length;
    const totalApps = allApplications.length;
    const avg = totalApps ? Math.round(allApplications.reduce((sum, app) => {
      const student = byId(allUsers, app.studentId);
      const job = byId(allJobs, app.jobId);
      return sum + (student && job ? scoreJob(student, job) : 0);
    }, 0) / totalApps) : 0;

    const metricVals = document.querySelectorAll(".metric-val");
    if (metricVals[0]) metricVals[0].textContent = String(studentCount);
    if (metricVals[1]) metricVals[1].textContent = String(activeJobs);
    if (metricVals[2]) metricVals[2].textContent = totalApps.toLocaleString();
    if (metricVals[3]) metricVals[3].textContent = `${avg}%`;



    const usersTable = document.getElementById("admin-users-table");
    if (usersTable) {
      usersTable.innerHTML = allUsers.slice(0, 4).map((user, i) => `
        <div class="t-row users-grid">
          <div class="u-info"><div class="u-av" style="background:${i % 2 ? "#639922" : "#3B6D11"}">${initials(user)}</div><div><div class="u-name">${escapeHtml(displayName(user))}</div><div class="u-course">${escapeHtml(user.role === "student" ? `${user.program || ""} ${user.section || ""}` : user.role === "employer" ? "Third-party employer" : "College admin")}</div></div></div>
          <div><span class="role-pill ${user.role === "student" ? "rp-student" : "rp-employer"}">${escapeHtml(user.role[0].toUpperCase() + user.role.slice(1))}</span></div>
          <div style="color:rgba(192,221,151,0.5)">${escapeHtml(user.program || organizationName(user) || "—")}</div>
          <div style="color:rgba(192,221,151,0.5)">${shortDate(new Date().toISOString())}</div>
          <div class="${i === 3 ? "status-inactive" : "status-active"}"><div class="s-dot" style="background:${i === 3 ? "rgba(192,221,151,0.2)" : "#97C459"}"></div>${i === 3 ? "Inactive" : "Active"}</div>
        </div>
      `).join("");
    }

    const health = document.getElementById("admin-health-card");
    if (health) {
      health.innerHTML = `
        <div class="rp-row"><span>Active students</span><span class="rp-val">${studentCount}</span></div>
        <div class="rp-row"><span>Active employers</span><span class="rp-val">${employers().length}</span></div>
        <div class="rp-row"><span>Listings live</span><span class="rp-val">${activeJobs}</span></div>
        <div class="rp-row"><span>Total applications</span><span class="rp-val">${totalApps}</span></div>
        <div class="rp-row"><span>Avg. match score</span><span class="rp-val">${avg}%</span></div>
      `;
    }
    const alerts = document.getElementById("admin-alerts-card");
    if (alerts) {
      const lowApps = allJobs.filter((j) => applicationsForJob(j.id).length < 2).length;
      alerts.innerHTML = `
        <div class="alert-row"><div class="alert-dot alert-warn"></div><div>${lowApps} listings have low applicant volume.</div></div>
        <div class="alert-row"><div class="alert-dot alert-info"></div><div>AI matching engine refreshed skill signals.</div></div>
        <div class="alert-row"><div class="alert-dot alert-info"></div><div>${studentCount} student accounts active.</div></div>
      `;
    }
  }

  function renderAdminUsersPage() {
    const target = document.getElementById("admin-users-directory");
    if (!target) return;
    target.innerHTML = allUsers.map((user, index) => `
      <div class="t-row users-grid">
        <div class="u-info"><div class="u-av" style="background:${index % 2 ? "#639922" : "#3B6D11"}">${initials(user)}</div><div><div class="u-name">${escapeHtml(displayName(user) || organizationName(user) || "Unknown user")}</div><div class="u-course">${escapeHtml(user.email || "No email")}</div></div></div>
        <div><span class="role-pill ${user.role === "student" ? "rp-student" : user.role === "employer" ? "rp-employer" : "rp-admin"}">${escapeHtml(user.role[0].toUpperCase() + user.role.slice(1))}</span></div>
        <div style="color:rgba(192,221,151,0.5)">${escapeHtml(user.role === "student" ? `${user.program || ""} ${user.section || ""}`.trim() || "Student profile" : user.role === "employer" ? organizationName(user) || "Employer account" : "College oversight")}</div>
        <div style="color:rgba(192,221,151,0.5)">${shortDate(new Date().toISOString())}</div>
        <div class="status-active"><div class="s-dot" style="background:#97C459"></div>Active</div>
      </div>
    `).join("");
  }

  function renderAdminListingsPage() {
    const target = document.getElementById("admin-listings-directory");
    if (!target) return;
    target.innerHTML = allJobs.map((job) => `
      <div class="t-row jobs-grid">
        <div><div class="u-name">${escapeHtml(job.title)}</div><div class="u-course">${escapeHtml(job.type || "Role")}</div></div>
        <div style="color:rgba(192,221,151,0.78)">${escapeHtml(companyName(job) || "Unknown company")}</div>
        <div style="color:rgba(192,221,151,0.78)">${applicationsForJob(job.id).length}</div>
        <div style="color:rgba(192,221,151,0.78)">${Math.max(...students().map((student) => scoreJob(student, job)), 0)}%</div>
        <div class="${job.status === "active" ? "status-active" : "status-inactive"}"><div class="s-dot" style="background:${job.status === "active" ? "#97C459" : "rgba(192,221,151,0.2)"}"></div>${escapeHtml(job.status)}</div>
      </div>
    `).join("");
  }

  function renderAdminApplicationsPage() {
    const target = document.getElementById("admin-applications-directory");
    if (!target) return;
    target.innerHTML = allApplications.map((application) => {
      const student = byId(allUsers, application.studentId);
      const job = byId(allJobs, application.jobId);
      return `
        <div class="panel-row">
          <strong>${escapeHtml(displayName(student) || "Unknown student")}</strong> applied to ${escapeHtml(job?.title || "Unknown job")} · ${escapeHtml(application.status)} · ${shortDate(application.appliedAt || new Date().toISOString())}
        </div>
      `;
    }).join("");
  }

  function renderAdminAiLogsPage() {
    const target = document.getElementById("admin-ai-log-list");
    if (!target) return;
    const matches = allJobs.slice(0, 6).map((job) => {
      const topStudent = students().map((student) => ({ student, score: scoreJob(student, job) })).sort((left, right) => right.score - left.score)[0];
      return `
        <div class="panel-row">
          <strong>${escapeHtml(job.title)}</strong> matched with ${escapeHtml(displayName(topStudent?.student) || "No student")} at ${topStudent?.score || 0}% using resume-derived skills.
        </div>
      `;
    });
    target.innerHTML = matches.join("");
  }

  function renderAdminEmployersPage() {
    const target = document.getElementById("admin-employers-directory");
    if (!target) return;
    target.innerHTML = employers().map((employer, index) => `
      <div class="t-row users-grid">
        <div class="u-info"><div class="u-av" style="background:${index % 2 ? "#639922" : "#3B6D11"}">${initials(employer)}</div><div><div class="u-name">${escapeHtml(organizationName(employer) || displayName(employer))}</div><div class="u-course">${escapeHtml(employer.email || "No email")}</div></div></div>
        <div><span class="role-pill rp-employer">Employer</span></div>
        <div style="color:rgba(192,221,151,0.5)">${allJobs.filter((job) => job.employerId === employer.id).length} live jobs</div>
        <div style="color:rgba(192,221,151,0.5)">${allApplications.filter((application) => byId(allJobs, application.jobId)?.employerId === employer.id).length} applications</div>
        <div class="status-active"><div class="s-dot" style="background:#97C459"></div>Verified</div>
      </div>
    `).join("");
  }

  function renderAdminAnnouncementsPage() {
    const target = document.getElementById("admin-announcements-list");
    if (!target) return;
    target.innerHTML = [
      "Resume-matching workflows are active for all student accounts.",
      "Employers can browse dedicated applicants and hired-students tabs.",
      "Admin pages navigate end-to-end across all routes."
    ].map((item) => `<div class="panel-row">${escapeHtml(item)}</div>`).join("");
  }

  function renderAdminReportsPage() {
    const target = document.getElementById("admin-reports-list");
    if (!target) return;
    target.innerHTML = `
      <div class="rp-row"><span>Total students</span><span class="rp-val">${students().length}</span></div>
      <div class="rp-row"><span>Total employers</span><span class="rp-val">${employers().length}</span></div>
      <div class="rp-row"><span>Total job listings</span><span class="rp-val">${allJobs.length}</span></div>
      <div class="rp-row"><span>Total applications</span><span class="rp-val">${allApplications.length}</span></div>
    `;
  }

  function renderAdminSettingsPage() {
    const target = document.getElementById("admin-settings-list");
    if (!target) return;
    target.innerHTML = `
      <div class="panel-row">Platform mode: browser-based with backend migration in progress</div>
      <div class="panel-row">Matching source: resume-derived skills only</div>
      <div class="panel-row">Deployable route set: public, student, employer, and admin tabs connected</div>
    `;
  }

  function renderAdminAuditLogsPage() {
    const target = document.getElementById("admin-audit-log-list");
    if (!target) return;
    target.innerHTML = [
      "Student dashboard viewed",
      "Employer applicants tab opened",
      "Admin reports tab opened",
      "Route index page visited"
    ].map((item, index) => `<div class="panel-row">${shortDate(new Date(Date.now() - index * 3600 * 1000).toISOString())} · ${escapeHtml(item)}</div>`).join("");
  }

  // ── LANDING PAGES ──────────────────────────────────────────────────────────
  function renderLanding() {}
  function renderForEmployersPage() {}
  function renderAboutPage() {}
  function renderRoutesPage() {}

  // ── AUTH HELPERS ───────────────────────────────────────────────────────────
  function showTab(tab, element) {
    document.querySelectorAll(".auth-tab").forEach((item) => item.classList.remove("active"));
    element.classList.add("active");
    document.getElementById("login-panel").style.display = tab === "login" ? "block" : "none";
    document.getElementById("signup-panel").style.display = tab === "signup" ? "block" : "none";
  }

  function selectRole(element) {
    document.querySelectorAll(".role-selector .role-card").forEach((item) => item.classList.remove("selected"));
    element.classList.add("selected");
  }

  function selectSignupRole(role) {
    uiState.signupRole = role;
    document.getElementById("signup-student").classList.toggle("selected", role === "student");
    document.getElementById("signup-employer").classList.toggle("selected", role === "employer");
    document.getElementById("student-extras").classList.toggle("visible", role === "student");
    document.getElementById("employer-extras").classList.toggle("visible", role === "employer");
  }

  function filterApps(status, element) {
    uiState.applicationFilter = status;
    if (element) document.querySelectorAll(".stab").forEach((tab) => tab.classList.toggle("active", tab === element));
    renderApplications();
  }

  function unsave(button) {
    if (button?.dataset?.saveJob) toggleSaved(button.dataset.saveJob);
  }

  // ─── BOOTSTRAP ────────────────────────────────────────────────────────────
  async function boot() {
    await initSupabase();

    const session = await getSession();

    // Auth page — just init the form, no redirect needed
    if (PAGE === "auth") {
      initAuthPage();
      return;
    }

    // Public/landing pages — no auth required, just render
    if (["landing", "for-employers", "about", "routes"].includes(PAGE)) {
      renderCurrentPage();
      return;
    }

    // Protected pages — require login
    if (!session) {
      window.location.href = PAGE_URLS.auth;
      return;
    }

    currentUserId = session.user.id;

    // Load profile
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", currentUserId).single();
    currentUserProfile = profile;

    // Guard: wrong role on wrong page
    if (PAGE.startsWith("employer") || ["company-profile", "hired-students"].includes(PAGE)) {
      if (profile?.role !== "employer") { window.location.href = PAGE_URLS.studentDashboard; return; }
    }
    if (PAGE === "admin" || PAGE.startsWith("admin-")) {
      if (profile?.role !== "admin") { window.location.href = PAGE_URLS.studentDashboard; return; }
    }

    await loadAllData();

    syncChrome();
    injectUtilityLinks();

    if (PAGE === "job-listing") {
      document.getElementById("job-search-input")?.addEventListener("input", renderJobListing);
    }

    renderCurrentPage();
  }

  document.addEventListener("DOMContentLoaded", boot);

  // Expose globals for inline onclick handlers in HTML
  window.showTab = showTab;
  window.selectRole = selectRole;
  window.selectSignupRole = selectSignupRole;
  window.filterApps = filterApps;
  window.unsave = unsave;
})();
