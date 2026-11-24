// Decide what an early end does from the current mode and submitted answers.
// The identity introduction is not an IELTS question.
export function endSessionPlan(trainingMode, session) {
  const answerCount = (session?.candidate_answers || []).filter((answer) => answer.phase !== "identity").length;
  const followUps = session?.part1_queue?.length || session?.part1_secondary_questions?.length || 3;
  const part1 = trainingMode === "mock" ? 1 + followUps : session?.part1_queue?.length || 4;
  const part3 = session?.part3_target_count || 4;
  const type = session?.practice_type || "full";
  const expected = type === "part1" ? part1 : type === "part2" ? 2 : type === "part3" ? part3 : part1 + 2 + part3;
  return {
    answerCount,
    totalQuestions: Math.max(answerCount, expected),
    action: trainingMode === "practice" && answerCount > 0 ? "recap" : "home",
  };
}
