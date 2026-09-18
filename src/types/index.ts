/**
 * Source of Truth: MASTER_SPEC_UJIAN_ONLINE_APPS_SCRIPT_GOOGLE_SHEETS.pdf
 * Database entities, Enums, and API Contracts
 */

export type UserRole = 'STUDENT' | 'ADMIN';
export type EntityStatus = 'ACTIVE' | 'ARCHIVED';
export type QuestionType = 'MCQ' | 'ESSAY';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type RunStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type RunDataStatus = 'ACTIVE' | 'RESET';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMEOUT' | 'INVALIDATED';
export type EventType = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'PAGE_RELOAD' | 'OTHER';
export type AlarmStatus = 'ACTIVE' | 'MUTED' | 'RESOLVED';
export type PermissionType = 'LEAVE_EXAM' | 'MUTE_ALARM';

export interface SettingItem {
  Setting_Key: string;
  Setting_Value: string;
  Description: string;
  Updated_At: string;
}

export interface UserItem {
  User_ID: string;
  NIM: string;
  Full_Name: string;
  Email?: string;
  Class_Name: string;
  Role: UserRole;
  Is_Active: boolean;
  Created_At: string;
  Updated_At: string;
}

export interface CourseItem {
  Course_ID: string; // CRS001...
  Course_Code: string; // BIOKIM, IPK, TLAB, KDBIO
  Course_Name: string;
  Description: string;
  Status: EntityStatus;
  Created_At: string;
  Updated_At: string;
}

export interface TopicItem {
  Topic_ID: string; // TPC...
  Course_ID: string;
  Topic_Name: string;
  Description: string;
  Sort_Order: number;
  Status: EntityStatus;
  Created_At: string;
  Updated_At: string;
}

export interface QuestionBankItem {
  Bank_ID: string; // BNK...
  Course_ID: string;
  Bank_Name: string;
  Description: string;
  Status: EntityStatus;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
}

export interface QuestionItem {
  Question_ID: string; // Q...
  Bank_ID: string;
  Topic_ID: string;
  Question_Type: QuestionType;
  Difficulty: DifficultyLevel;
  Status: EntityStatus;
  Current_Version_ID: string;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
}

export interface QuestionVersionItem {
  Version_ID: string; // QV...
  Question_ID: string;
  Version_Number: number;
  Question_Text: string;
  Image_URL?: string;
  Default_Points: number;
  Answer_Guide?: string; // Khusus essay/admin, NEVER sent to student
  Explanation?: string; // Pembahasan/admin
  Created_By: string;
  Created_At: string;
}

export interface OptionItem {
  Option_ID: string; // OPT...
  Version_ID: string;
  Option_Key: OptionKey;
  Option_Text: string;
  Is_Correct?: boolean; // SECRET: calculated server-side, NEVER sent to student
  Sort_Order: number;
}

export interface ExamItem {
  Exam_ID: string; // EXM...
  Course_ID: string;
  Exam_Name: string;
  Instructions: string;
  Duration_Minutes: number;
  Shuffle_Questions: boolean;
  Shuffle_Options: boolean;
  Anti_Cheat_Enabled: boolean;
  Fullscreen_Required: boolean;
  Response_Retention_Days: number;
  Status: ExamStatus;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
}

export interface ExamQuestionItem {
  Exam_Question_ID: string; // EQ...
  Exam_ID: string;
  Version_ID: string; // Version_ID locked at exam creation
  Question_Number: number;
  Points: number;
  Is_Required: boolean;
}

export interface ExamRunItem {
  Run_ID: string; // RUN...
  Exam_ID: string;
  Run_Name: string;
  Class_Name: string;
  Start_At: string;
  End_At: string;
  Access_Code: string; // SECRET
  Status: RunStatus;
  Response_Retention_Days: number;
  Delete_After: string;
  Data_Status: RunDataStatus;
  Created_By: string;
  Created_At: string;
  Closed_At?: string;
  Reset_At?: string;
}

export interface AttemptItem {
  Attempt_ID: string; // ATT...
  Run_ID: string;
  Student_ID: string;
  Started_At: string;
  Submitted_At?: string;
  Expires_At: string;
  Status: AttemptStatus;
  Objective_Score: number;
  Essay_Score: number;
  Final_Score: number;
  Violation_Count: number;
  Last_Sync_At: string;
  Client_Submission_ID?: string;
}

export interface AnswerItem {
  Answer_ID: string; // ANS...
  Attempt_ID: string;
  Exam_Question_ID: string;
  Selected_Option_ID?: string;
  Answer_Text?: string;
  Is_Correct?: boolean; // Evaluated server-side
  Auto_Score?: number; // Evaluated server-side
  Manual_Score?: number; // Scored by lecturer
  Lecturer_Feedback?: string;
  Saved_At: string;
  Graded_At?: string;
  Graded_By?: string;
}

export interface ViolationItem {
  Violation_ID: string; // VIO...
  Attempt_ID: string;
  Event_Type: EventType;
  Detected_At: string;
  Duration_Seconds: number;
  Is_Authorized: boolean;
  Alarm_Status: AlarmStatus;
  Resolved_At?: string;
  Resolved_By?: string;
  Admin_Note?: string;
}

export interface PermissionItem {
  Permission_ID: string; // PERM...
  Attempt_ID: string;
  Permission_Type: PermissionType;
  Starts_At: string;
  Expires_At: string;
  Reason: string;
  Granted_By: string;
  Is_Active: boolean;
  Created_At: string;
}

export interface AdminLogItem {
  Log_ID: string; // LOG...
  Admin_ID: string;
  Action_Type: string;
  Target_Type: string;
  Target_ID: string;
  Details: string;
  Created_At: string;
}

// Student Exam Payload (Strictly sanitized, NO Is_Correct, NO Answer_Guide)
export interface StudentOptionPayload {
  Option_ID: string;
  Option_Key: OptionKey;
  Option_Text: string;
  Sort_Order: number;
}

export interface StudentQuestionPayload {
  Exam_Question_ID: string;
  Question_Number: number;
  Question_Type: QuestionType;
  Question_Text: string;
  Image_URL?: string;
  Points: number;
  Is_Required: boolean;
  Options?: StudentOptionPayload[];
}

export interface StudentExamSession {
  Attempt_ID: string;
  Run_ID: string;
  Exam_Name: string;
  Course_Name: string;
  Class_Name: string;
  Student_Name: string;
  Student_NIM: string;
  Duration_Minutes: number;
  Started_At: string;
  Expires_At: string;
  Fullscreen_Required: boolean;
  Anti_Cheat_Enabled: boolean;
  Questions: StudentQuestionPayload[];
  ExistingAnswers: Record<string, { Selected_Option_ID?: string; Answer_Text?: string; Flagged?: boolean }>;
}
