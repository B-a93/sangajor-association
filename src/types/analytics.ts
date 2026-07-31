export type MonthlyActivity = {
  month: string;
  members: number;
  payments: number;
};

export type ExecutiveAnalyticsData = {
  generatedAt: string;
  rangeDays: number;
  members: { total: number; new: number };
  finance: { collected: number; payments: number };
  engagement: {
    eventResponses: number;
    villagePosts: number;
    volunteerApplications: number;
    announcementReads: number;
  };
  monthlyActivity: MonthlyActivity[];
};
