#Requires AutoHotkey v2.0
#SingleInstance Force

; ============================================================
; FRS Box Holder CSV Exporter - TUPSS
; RCWilson: centers 3606, 6822, 6964, 7177
; JBURNHAM: center 7
; ============================================================

; --- EXACT COORDINATES (calibrated from live screen) ---
; Login page
LOGIN_URL      := "https://frs.theupsstore.com/Framework/SignIn.aspx"
REPORT_URL     := "https://frs.theupsstore.com/UI/Reporting/Mailbox/BoxHolderList.aspx"
MAILBOX_URL    := "https://frs.theupsstore.com/UI/Reporting/Mailbox/MailboxReports.aspx"

; Login fields
X_USER         := 500
Y_USER         := 348
Y_PASS         := 415
Y_SIGNIN       := 468

; Report page
X_CENTER_DD    := 370   ; Center Number dropdown
Y_CENTER_DD    := 372
; Center options in dropdown (after clicking dropdown)
Y_3606         := 422
Y_6822         := 445
Y_6964         := 467
Y_7177         := 490
Y_7_ONLY       := 422   ; Center 7 is first in JBURNHAM's list

; Agreement Status dropdown
X_AGREE        := 573
Y_AGREE        := 583
Y_NEW_ACTIVE   := 699   ; "New And Active" option

; Go button
X_GO           := 1259
Y_GO           := 583

; Export
X_FLOPPY       := 501
Y_FLOPPY       := 677
X_CSV          := 571
Y_CSV          := 749

; My Account (sign out)
X_MYACCT       := 460
Y_MYACCT       := 121

; ============================================================
WaitLoad(ms) {
    Sleep(ms)
}

ClickAt(x, y, delay := 600) {
    MouseMove(x, y)
    Click()
    Sleep(delay)
}

ClearAndType(x, y, text) {
    MouseMove(x, y)
    Click()
    Sleep(300)
    Send("^a")
    Sleep(100)
    Send("{Delete}")
    Sleep(100)
    Send(text)
    Sleep(300)
}

; ============================================================
; STEP 1: Login as RCWilson
; ============================================================
Run('chrome.exe "' . LOGIN_URL . '"')
WaitLoad(5000)

ClearAndType(X_USER, Y_USER, "RCWilson")
Send("{Tab}")
WaitLoad(1000)   ; let Chrome autofill password
ClickAt(X_USER, Y_SIGNIN)
WaitLoad(6000)   ; wait for dashboard to load

; ============================================================
; STEP 2: Export each center for RCWilson
; ============================================================
ExportCenter(centerY) {
    global REPORT_URL, X_CENTER_DD, Y_CENTER_DD
    global X_AGREE, Y_AGREE, Y_NEW_ACTIVE, X_GO, Y_GO
    global X_FLOPPY, Y_FLOPPY, X_CSV, Y_CSV

    ; Navigate directly to Box Holder List
    Run('chrome.exe "' . REPORT_URL . '"')
    Sleep(5000)

    ; Open Center Number dropdown
    ClickAt(X_CENTER_DD, Y_CENTER_DD)
    Sleep(600)
    ; Click the specific center
    ClickAt(X_CENTER_DD, centerY)
    Sleep(600)

    ; Open Agreement Status dropdown
    ClickAt(X_AGREE, Y_AGREE)
    Sleep(600)
    ; Click "New And Active"
    ClickAt(X_AGREE, Y_NEW_ACTIVE)
    Sleep(400)

    ; Click Go
    ClickAt(X_GO, Y_GO)
    Sleep(9000)   ; wait for results to load

    ; Click export (floppy) icon
    ClickAt(X_FLOPPY, Y_FLOPPY)
    Sleep(800)
    ; Click CSV (comma delimited)
    ClickAt(X_CSV, Y_CSV)
    Sleep(3000)   ; wait for download
}

ExportCenter(Y_3606)
ExportCenter(Y_6822)
ExportCenter(Y_6964)
ExportCenter(Y_7177)

; ============================================================
; STEP 3: Sign out of RCWilson
; ============================================================
ClickAt(X_MYACCT, Y_MYACCT)   ; "My Account >" in top nav
Sleep(800)
; Find and click Sign Out link
Run('chrome.exe "https://frs.theupsstore.com/Framework/SignIn.aspx?signout=true"')
WaitLoad(4000)

; ============================================================
; STEP 4: Login as JBURNHAM
; ============================================================
ClearAndType(X_USER, Y_USER, "JBURNHAM")
Send("{Tab}")
WaitLoad(1000)
ClickAt(X_USER, Y_SIGNIN)
WaitLoad(6000)

; ============================================================
; STEP 5: Export Center 7 for JBURNHAM
; ============================================================
ExportCenter(Y_7_ONLY)

; ============================================================
MsgBox("All 5 CSVs downloaded!`n`nDrop them into Claude to finish the update.", "FRS Done", 64)
