interface StandupSummaryItem {
  userName: string;
  userRole: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
  blockerLevel: 'NONE' | 'MINOR' | 'CRITICAL';
}

export class AIService {
  /**
   * Generates a comprehensive AI analysis of daily standup submissions
   */
  static generateDailySummary(standups: StandupSummaryItem[], totalMembersCount: number) {
    const submittedCount = standups.length;
    const pendingCount = Math.max(0, totalMembersCount - submittedCount);

    const criticalBlockers = standups.filter(s => s.blockerLevel === 'CRITICAL');
    const minorBlockers = standups.filter(s => s.blockerLevel === 'MINOR');
    const totalBlockers = criticalBlockers.length + minorBlockers.length;

    // Detect implicit blockers in text content (AI Blocker Detection)
    const implicitBlockers: { userName: string; detectedPhrase: string; text: string }[] = [];
    const triggerPhrases = [
      'waiting for', 'unable to', 'cannot proceed', 'blocked by',
      'need approval', 'dependency', 'permission missing', 'credentials',
      'stuck on', 'pending response', 'waiting on'
    ];

    standups.forEach(s => {
      const allText = [...s.yesterday, ...s.today, ...s.blockers].join(' ').toLowerCase();
      triggerPhrases.forEach(phrase => {
        if (allText.includes(phrase) && s.blockerLevel === 'NONE') {
          implicitBlockers.push({
            userName: s.userName,
            detectedPhrase: phrase,
            text: [...s.today, ...s.blockers].join('; ')
          });
        }
      });
    });

    // Executive Summary Generation
    let executiveSummary = '';
    const completionPercentage = totalMembersCount > 0 ? Math.round((submittedCount / totalMembersCount) * 100) : 0;

    if (submittedCount === 0) {
      executiveSummary = 'No team members have submitted standup updates for today yet. Automated morning reminders are active.';
    } else {
      executiveSummary = `${submittedCount} of ${totalMembersCount} team members (${completionPercentage}%) have submitted their daily updates. `;

      if (criticalBlockers.length > 0) {
        executiveSummary += `🚨 Critical attention required: ${criticalBlockers.length} team member(s) reported severe blockers (e.g., ${criticalBlockers.map(b => b.userName).join(', ')}). `;
      } else if (minorBlockers.length > 0) {
        executiveSummary += `🟡 ${minorBlockers.length} minor blocker(s) reported across the team. Core feature development remains on track. `;
      } else {
        executiveSummary += `🟢 Excellent progress! Zero active blockers reported today across all submitted updates. `;
      }

      executiveSummary += `Key focus areas today include UI enhancements, API integration, and quality assurance testing.`;
    }

    // Risk Analysis
    const identifiedRisks: string[] = [];
    if (criticalBlockers.length >= 2) {
      identifiedRisks.push(`High Bottleneck Risk: Multiple critical blockers are concurrently halting development progress.`);
    }

    // Check for common words in blockers (e.g. backend, API, access, credentials)
    const combinedBlockerText = standups.map(s => s.blockers.join(' ')).join(' ').toLowerCase();
    if (combinedBlockerText.includes('access') || combinedBlockerText.includes('credential') || combinedBlockerText.includes('permission')) {
      identifiedRisks.push(`Infrastructure/Access Dependency Risk: Infrastructure credentials or environment permissions are slowing down key developers.`);
    }
    if (combinedBlockerText.includes('api') || combinedBlockerText.includes('backend') || combinedBlockerText.includes('endpoint')) {
      identifiedRisks.push(`API Contract Risk: Frontend and backend API synchronization issue identified.`);
    }

    if (pendingCount > 2) {
      identifiedRisks.push(`Visibility Risk: ${pendingCount} team members have not submitted standups today. Status of their deliverables is unconfirmed.`);
    }

    // Actionable Recommendations for Manager
    const recommendations: string[] = [];
    if (criticalBlockers.length > 0) {
      criticalBlockers.forEach(cb => {
        recommendations.push(`Prioritize resolving ${cb.userName}'s critical blocker: "${cb.blockers.join(', ') || 'Unspecified blocker'}" immediately.`);
      });
    }

    if (implicitBlockers.length > 0) {
      implicitBlockers.forEach(ib => {
        recommendations.push(`Check in with ${ib.userName} — AI detected potential implicit blocker phrasing ("${ib.detectedPhrase}") in their update.`);
      });
    }

    if (pendingCount > 0) {
      recommendations.push(`Send a gentle nudge to the ${pendingCount} pending member(s) to submit their daily standup updates.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Team is fully synchronized and unblocked. Continue monitoring upcoming sprint deliverables.');
    }

    return {
      date: new Date().toISOString().split('T')[0],
      totalMembers: totalMembersCount,
      submittedCount,
      pendingCount,
      submissionRate: completionPercentage,
      totalBlockers,
      criticalBlockersCount: criticalBlockers.length,
      minorBlockersCount: minorBlockers.length,
      executiveSummary,
      implicitBlockers,
      identifiedRisks,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }
}
