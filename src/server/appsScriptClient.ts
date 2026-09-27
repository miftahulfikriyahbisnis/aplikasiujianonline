/**
 * Apps Script Client
 * Connects to Google Apps Script Web App backed by Google Sheets
 * Uses APPS_SCRIPT_API_URL and APPS_SCRIPT_API_SECRET strictly server-side
 */

export interface AppsScriptResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class AppsScriptClient {
  private customUrl: string = '';

  public getUrl(): string {
    return this.customUrl || process.env.APPS_SCRIPT_API_URL || '';
  }

  public setUrl(url: string): void {
    this.customUrl = url;
  }

  public hasSecret(): boolean {
    return !!process.env.APPS_SCRIPT_API_SECRET;
  }

  public async call<T = any>(action: string, payload: any = {}, token?: string): Promise<AppsScriptResponse<T>> {
    const url = this.getUrl();
    const secret = process.env.APPS_SCRIPT_API_SECRET;

    if (!url) {
      throw new Error('APPS_SCRIPT_API_URL belum dikonfigurasi di environment / Secrets.');
    }

    // Google Sheets writing operations can take up to 45-90 seconds in Apps Script
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const bodyObj: any = {
      action,
      data: payload,
      payload: payload
    };

    if (secret) {
      bodyObj.secret = secret;
    }
    if (token) {
      bodyObj.token = token;
    }

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyObj),
        signal: controller.signal,
        redirect: 'manual'
      });

      // Follow redirects using GET (required by Google Apps Script ContentService echo endpoint)
      let redirectCount = 0;
      while (response.status >= 300 && response.status < 400 && response.headers.get('location') && redirectCount < 5) {
        redirectCount++;
        const redirectUrl = response.headers.get('location')!;
        response = await fetch(redirectUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual'
        });
      }

      clearTimeout(timeoutId);

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (err) {
        throw new Error(`Google Apps Script mengembalikan respon non-JSON: ${text.substring(0, 300)}`);
      }

      if (json.ok === false) {
        throw new Error(json.error || json.message || 'Error dari Google Apps Script');
      }

      return json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Koneksi ke Google Apps Script timeout (>90 detik).');
      }
      throw err;
    }
  }

  public async healthCheck() {
    return this.call('healthCheck', {});
  }

  public async healthCheckFull() {
    return this.call('healthCheckFull', {});
  }

  public async listCourses() {
    return this.call('listCourses', {});
  }

  public async createCourse(data: { Course_Code: string; Course_Name: string; Description?: string }) {
    return this.call('createCourse', data);
  }

  public async updateCourse(data: { Course_ID: string; Course_Code?: string; Course_Name?: string; Description?: string; Status?: string }) {
    return this.call('updateCourse', data);
  }

  public async listRuns() {
    return this.call('listRuns', {});
  }

  public async studentLogin(data: { NIM: string; Full_Name: string; Class_Name: string; Access_Code: string }) {
    return this.call('studentLogin', data);
  }

  public async startAttempt(token: string) {
    return this.call('startAttempt', {}, token);
  }

  public async getExamQuestions(token: string, attemptId: string) {
    return this.call('getExamQuestions', { Attempt_ID: attemptId }, token);
  }

  public async saveAnswers(
    token: string,
    attemptId: string,
    answers: Array<{
      Exam_Question_ID: string;
      Selected_Option_ID?: string;
      Answer_Text?: string;
    }>
  ) {
    return this.call(
      'saveAnswers',
      {
        Attempt_ID: attemptId,
        attemptId: attemptId,
        answers: answers
      },
      token
    );
  }

  public async recordViolation(
    token: string,
    attemptId: string,
    data: {
      Event_Type: string;
      Detected_At: string;
      Duration_Seconds?: number;
    }
  ) {
    return this.call(
      'recordViolation',
      {
        Attempt_ID: attemptId,
        attemptId: attemptId,
        Event_Type: data.Event_Type,
        Detected_At: data.Detected_At,
        Duration_Seconds: data.Duration_Seconds || 0,
        event: {
          eventType: data.Event_Type,
          durationSeconds: data.Duration_Seconds || 0
        }
      },
      token
    );
  }

  public async submitExam(token: string, attemptId: string) {
    return this.call(
      'submitExam',
      {
        Attempt_ID: attemptId,
        attemptId: attemptId,
        clientSubmissionId: attemptId
      },
      token
    );
  }

  public async exportRunXlsx(runId: string) {
    return this.call('exportRunXlsx', { Run_ID: runId });
  }
}

export const appsScriptClient = new AppsScriptClient();
