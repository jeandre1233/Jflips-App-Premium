# Implementation Plan: Streamlined Payslips, Default Logging Coach & Historical Continuity

Refine the coach payslip system into a clean, direct document with zero payment status clutter, add an auto-select **Default Logging Coach** option in Staff Management so the owner is pre-selected when logging sessions, provide historical payslip lookup in both **History** (for owners) and **My Pay** (for coaches), and purge all legacy "turn-in" fee logic.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following adjustments have been incorporated based on your latest requirements:
>
> 1. **Default Logging Coach (Owner Staff Profile)**:
>    - In **Team Management → Staff Profiles**, add a **"Default Logging Coach"** option/badge.
>    - You can designate your staff profile as the default logging coach.
>    - When logging classes, team practices, or gym sessions, this coach is **automatically pre-selected** by default, saving you clicks every time you log a session.
>    - Your profile behaves exactly like every other staff coach (pay rate, banking details, combined payslip), eliminating the need for any separate owner "turn-in" fee mechanisms.
>
> 2. **Staff "My Pay" Historical Continuity**:
>    - In the coach's **My Pay** tab, add a **Billing Period Selector** (dropdown/tabs).
>    - Staff members can view their current active period payslip or look back at any past month's archived payslips to verify past earnings and download past records.
>
> 3. **Simplified Payslip Layout**:
>    - Header subtitle: Simply **"PAYSLIP"** directly under the `/Invoice.png` logo.
>    - Employer box: Labeled simply **"Employer"** (removing "Stunting & Tumbling Academy" subtext).
>    - Recipient box: Labeled simply **"Coach"** (removing "Payee / Coach" and designation sub-notes).
>    - Banking section: Labeled simply **"Banking Details"** (removing "Banking Destination / EFT remittance" sub-labels).
>
> 4. **Complete Removal of Payment & Status Tracking**:
>    - Removed all "Pending Payment" / "Settled (EFT)" status badges from both the roster view and the payslip itself.
>    - Removed the "Mark as Paid" action button.
>    - Removed the WhatsApp button (export is strictly via clean PDF and PNG downloads).
>
> 5. **Automatic Payslip Archiving on Reset**:
>    - When the month is reset or archived, the app will automatically save complete snapshot records into `staff_payslips` with unique reference IDs (`PAY-[YEAR]-[MONTH]-[COACH_ID]`).
>    - Owners can retrieve any past month's payslips in the **History** tab; coaches can retrieve them in **My Pay**.

---

## 1. Workflows & Architecture

### A. Default Logging Coach Workflow
1. In **Management → Staff**, each coach card features an action: **"Set as Default Logging Coach"** (indicated with an active star/badge).
2. When marked, this coach ID is stored in the owner profile (`default_logging_coach_id`).
3. Whenever an owner opens:
   - **Log Session** (classes & private lessons)
   - **Log Team Attendance** (school cheer practices & competitions)
   - **Log Gym Attendance** (external gym clinics)
   - **Quick Log Modal**
   the form will automatically initialize with this default coach pre-selected.

### B. Streamlined Payslip Document
- **Header**: `/Invoice.png` banner with a clean, minimal **PAYSLIP** title beneath it.
- **Period & Ref**: Pay Period, Issue Date, and Reference (`PAY-[YEAR]-[MONTH]-[COACH_ID]`).
- **Employer**: Academy / Business Name.
- **Coach**: Coach Full Name (with email and cell if on profile).
- **Banking Details**: Bank Name, Account Number, Branch Code, Account Type.
- **5-Column Breakdown**: Date, Session or Class, Hourly Rate, Hours Coached, Total Earnings.
- **Summary**: Total Sessions, Total Hours Coached, and **Total Due (R...)**.
- **Actions**: Two clean buttons: **Download PDF** and **Download PNG**.

### C. Historical Continuity (My Pay & History Archive)
- **For Coaches in "My Pay"**:
  - Period selector at the top: **Current Active Period** vs **Archived Months** (e.g. August 2026, July 2026).
  - Selecting an archived month displays their exact historical payslip for that cycle.
- **For Owners in "History"**:
  - Under each archived month in the History tab, a **Staff Payslips** accordion lists all coaches from that month with one-click view and PDF re-export.

---

## 2. Technical System Diagram

```
┌────────────────────────────────────────────────────────┐
│            Staff Management (TeamManagementView)       │
│  - Staff profiles list                                 │
│  - Toggle: "Set as Default Logging Coach"              │
│    -> Saves `default_logging_coach_id` to Profile      │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│              Session Logging Forms                     │
│  (RegisterView / TeamAttendanceView / QuickLogModal)   │
│  - Initializes `coach_id = default_logging_coach_id`   │
│  - Auto-selects owner coach automatically              │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                    Accounts Hub                        │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────┐ │
│  │   Invoices   │   │   Payslips    │   │Merchandise │ │
│  │ (Clients/Org)│   │ (Active Roster│   │ (Apparel)  │ │
│  └──────────────┘   └───────┬───────┘   └────────────┘ │
└─────────────────────────────┼──────────────────────────┘
                              │
                    Monthly Reset Trigger
                              │
                              ▼
┌────────────────────────────────────────────────────────┐
│             Database: `staff_payslips`                 │
│  - id: UUID                                            │
│  - reference_id: PAY-2026-09-[COACH]                  │
│  - coach_id, owner_id, period_month                    │
│  - total_hours, gross_amount, snapshot_data            │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────────────┐ ┌────────────────────────┐
│   Owner: History View       │ │   Coach: My Pay View   │
│ - Select Past Month         │ │ - Select Past Period   │
│ - View all staff payslips   │ │ - View own past slip   │
└─────────────────────────────┘ └────────────────────────┘
```

---

## 3. Implementation Steps

1. **Add Default Logging Coach to Profile & Roster**:
   - Add `default_logging_coach_id?: string` to `OwnerProfile` and `Profile` in `types.ts`.
   - In `TeamManagementView`, add a button on coach cards: *"Set as Default Logging Coach"*.
   - In session logging forms (`RegisterView`, `TeamAttendanceView`, `GymAttendanceView`, `QuickLogModal`), default the initial coach selection to `profile.default_logging_coach_id || user?.id`.

2. **Clean Up Payslip Design in `AccountsView.tsx`**:
   - Header subtitle: Change to clean **"PAYSLIP"** directly under `/Invoice.png`.
   - Labels: Change to **"Employer"**, **"Coach"**, and **"Banking Details"**.
   - Strip all "Stunting & Tumbling Academy" sub-labels, "Payee / Coach", and "Designation" notes.
   - Remove settlement status badges ("Pending Payment" / "Settled via EFT").
   - Remove "Mark as Paid" and WhatsApp buttons.
   - Remove status chips from the coach list cards.

3. **Purge Legacy "Turn-in" References**:
   - Eliminate remaining mentions or special handling of "coach turn-in payout" or "Jay Flips Payout".
   - Ensure the owner's coaching profile is calculated cleanly and uniformly like all other coaches.

4. **Auto-Save Payslips on Reset**:
   - In `App.tsx` (`resetSingleInvoice` and `archiveMonth`), generate and persist `staff_payslips` records with structured reference numbers (`PAY-[YEAR]-[MONTH]-[COACH_ID]`).

5. **Historical Payslips in "My Pay" & "History"**:
   - In `AccountsView.tsx` (for coaches), add a period selector to switch between active and archived periods.
   - In `HistoryView.tsx` (for owners), display the archived staff payslips for the selected month with full viewing and PDF download.
