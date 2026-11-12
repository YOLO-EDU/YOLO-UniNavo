import { researchedSatRanges } from "../data/sat-research.ts";
import { expandedEvidence } from "../data/evidence.ts";
import { universities, planning, pathways } from "../data/index.ts";
import { strategies } from "../data/strategies.ts";
import { uiKo } from "./ko-ui.ts";
import { timeline } from "../data/timeline.ts";
import { universityKo } from "./ko-universities.ts";
import { timelineKo } from "./ko-timeline.ts";

export const contentKo: Record<string, string> = {};
for (const university of universities) {
  contentKo[`${university.city}, ${university.state}`] =
    `${uiKo[university.city] ?? university.city}, ${uiKo[university.state] ?? university.state}`;
  for (const [key, fact] of Object.entries(university.facts)) {
    const translation = universityKo[university.id]?.[key];
    if (translation) contentKo[fact.text] = translation;
  }
}
for (const month of timeline) {
  const translation = timelineKo[month.id];
  if (!translation) continue;
  contentKo[month.title] = translation[0];
  contentKo[month.focus] = translation[1];
  month.tasks.forEach((task, i) => {
    contentKo[task.title] = translation[2][i][0];
    contentKo[task.detail] = translation[2][i][1];
  });
}
const fits: Record<string, string> = {
  asu: "일반 입학 요건으로 탐색할 수 있는 인문학 전공을 갖춘 대규모 공립대입니다. 실제 온타리오 성적표를 ASU에 평가받으세요.",
  arizona:
    "폭넓은 사회과학 선택지를 갖춘 알려진 공립대입니다. 캐나다 교육과정에 적용되는 기준은 별도 확인이 필요합니다.",
  oregon:
    "문리대의 폭넓은 전공을 탐색하세요. 영어 면제, 과목 동등성, 전체 비용을 확인해야 합니다.",
  colorado:
    "합격자 점수 범위가 확인된 문리대 상향 지원 후보입니다. 이후 경영·공학으로의 전과가 보장되지는 않습니다.",
  "michigan-state":
    "폭넓은 사회과학 전공과 확인된 SAT 분포를 비교해 볼 수 있습니다. 영어 면제 규정은 개인별로 확인해야 합니다.",
  "indiana-bloomington":
    "IU는 온타리오 성적표 제출 지침을 제공합니다. 실제 관심에 맞춰 문리대 전공을 살펴보세요. Kelley 경영대는 별도 입학 경로를 따릅니다.",
  "penn-state":
    "이 항목은 University Park 캠퍼스입니다. 다른 캠퍼스나 2+2 경로는 별개의 합격이며, 전공 변경만으로 캠퍼스 입학 결과가 바뀌는 경우는 일반적이지 않습니다.",
  nyu: "상향 지원 대상으로만 탐색하세요. 문리대의 전공 선택은 유연하지만, 미정 전공이나 인문학을 선택하는 것이 합격의 지름길은 아닙니다.",
  "iowa-state":
    "현재 GPA 요건을 충족하는 대안 시험 점수를 명시한 실용적인 검토 후보입니다. 다른 학업·영어·재정 요건은 여전히 적용됩니다.",
};
for (const [id, text] of Object.entries(fits))
  contentKo[strategies[id].fit] = text;
const facts: Record<string, string> = {
  "sat-definition":
    "SAT는 Reading and Writing(읽기·쓰기)과 Math(수학)로 구성됩니다. 각 영역은 200~800점, 총점은 400~1600점입니다.",
  "sat-registration":
    "College Board 계정으로 등록하고 가능한 시험장을 선택하세요. 공개된 주말 시험 마감일은 미국·국제학생 모두에게 적용되며 미국 동부 시간 오후 11시 59분에 마감합니다. 기기 대여는 최소 시험 30일 전 등록·신청이 필요합니다.",
  "sat-score-choice":
    "Score Choice는 SAT 응시 날짜 단위로 전체 점수를 선택하는 기능입니다. 모든 점수를 요구하는 대학도 있습니다. 등록 시 선택한 무료 성적 전송이나 학교 내 시험에는 적용되지 않습니다.",
  "sat-superscore":
    "Superscoring은 대학이 허용할 때 서로 다른 시험 날짜의 영역별 최고점을 합산하는 방식입니다. Score Choice와 별개의 대학 정책이므로 대학·전공별로 확인하세요.",
  "sat-plan":
    "지금 Bluebook으로 시간 제한이 있는 진단 시험을 보세요. Khan Academy와 공식 Student Question Bank로 약점을 보완하세요. 첫 응시는 2027년 3월 6일, 대안은 5월 1일 또는 6월 5일을 고려할 수 있습니다. 5월 AP 기간에 과부하가 생기지 않도록 하세요. 재응시는 진단 결과, 지원 대학, 학교 학습량에 따라 결정합니다.",
  "sat-targets":
    "관심 대학의 공식 점수 분포와 정책에 맞춰 전략적 SAT 목표를 세우세요. 온타리오 평균을 SAT 목표로 바꾸는 보편적 환산표나 합격 보장 점수는 확인되지 않았습니다. 중간 50%는 명시된 집단의 분포이며 입학 요건이 아닙니다.",
  "sat-future":
    "2027~28년 SAT 날짜는 공식적으로 ‘예상(Anticipated)’으로 표시되어 있습니다. 검토한 일정에는 해당 주기의 등록 마감일과 성적 발표일이 아직 없습니다. 예상 날짜를 확정 일정으로 사용하지 마세요.",
  "ap-order-deadline":
    "2027년 AP 시험의 학교 권장 주문일은 2026년 10월 2일입니다. 연간·1학기·시험만 응시하는 반의 최종 주문은 2026년 11월 13일 미국 동부 시간 오후 11시 59분까지입니다. 봄학기 수업 주문과 가을 주문 변경은 2027년 3월 12일 같은 시간까지입니다.",
  "ap-local-deadline":
    "위 날짜는 AP 담당자·학교의 시험 주문 마감일이며 학생의 등록 마감일을 보장하지 않습니다. 각 학교는 더 이른 마감일, 수수료, 외부 학생 정책을 정합니다. 10월에 담당자에게 연락하여 올바른 반에 등록하고 실제 시험 주문을 확인하세요.",
  "ap-course-exam":
    "AP 수업 이수와 AP 시험만 응시하는 것은 다릅니다. College Board는 대부분의 AP 시험에서 수업 없이 응시하는 것을 허용하지만 수업 수강을 권장합니다. 응시 학교를 확보하고, 포트폴리오 과목의 추가 요건을 확인하세요. 시험만 준비한 것은 학교 성적표의 AP 수업 이수로 기록되지 않습니다.",
  "ap-score-policy":
    "AP는 1~5점 척도입니다. 많은 대학에서 3점 이상부터 과목별로 학점이나 수준별 배치를 인정하지만, 기준은 각 대학이 정합니다. 4~5점은 해당 대학의 학점 규정에 근거한 학습 목표일 뿐 보편적인 입학 필수 요건이 아닙니다.",
  "ap-2027":
    "2027년 정규 AP 시험은 5월 3~7일과 5월 10~14일에 열립니다. 일부 지역은 2027년 시작 시간 규정이 변경되므로 담당자에게 집합 시간과 장소를 확인하세요.",
  "ap-2028":
    "검토한 College Board 일정에는 2027년 날짜만 있고 2028년 날짜는 없습니다. 2028년 과목별 시험일은 ‘미발표’로 두고 12학년에 다시 확인하세요.",
  "ap-selection":
    "아래 네 과목은 모두 응시하라는 뜻이 아니라 검토할 후보입니다. 본인의 강점과 지원 환경에 맞는 한두 과목부터 선택하세요. 온타리오 학교 성적과 필수 선수 과목을 우선하세요.",
  "ossd-cohort":
    "이 11학년 학생이 2024년 가을에 9학년을 시작했다면 OSSD 기준은 필수 17학점·선택 13학점, 문해력 요건, 지역사회 봉사 40시간, 온라인 2학점입니다. 온라인 학점은 해당 제외 신청·면제가 완료된 경우 예외입니다. 실제 9학년 시작 연도를 진학 상담 교사와 확인하세요.",
  "ossd-financial-literacy":
    "금융 문해력 졸업 요건은 2025~26년 이후 9학년을 시작한 학생에게 적용되며 2026~27년 10학년 Career Studies부터 시행됩니다. 2024년 가을 9학년을 시작했다고 가정한 학생에게 자동 적용하지 마세요.",
  "ontario-um":
    "U는 University Preparation, M은 University/College Preparation 과목입니다. 온타리오는 진로에 맞춘 11·12학년 과목을 제공합니다. OSSD 졸업 요건 충족과 미국 대학별 과목·학업 수준 요건 충족은 별개입니다.",
  "ontario-gpa":
    "온타리오 성적은 학교의 원래 척도대로 유지하고 임의로 미국 GPA로 환산하지 마세요. Common App은 학교가 누적 GPA를 계산하지 않거나 양식에 없는 척도를 사용하면 해당 칸을 비워 두도록 안내합니다. 대학별 성적표 제출 지침을 따르세요.",
  "common-preparation":
    "지원 연도 전에 My Common Application의 답변, 활동, 개인 에세이를 준비할 수 있습니다. 대학별 질문과 추가 에세이는 해당 지원 주기를 기다리고 연간 갱신 후 다시 확인하세요.",
  "early-options":
    "Early Decision(ED)은 서명한 약정에 따른 구속력이 있고, Early Action(EA)은 비구속적입니다. Restrictive 또는 Single-Choice EA는 대학 규정에 따라 다른 조기 지원을 제한합니다. ED를 선택하기 전에 실제 약정과 재정보조 조건을 읽으세요.",
  citizenship:
    "온타리오 거주·재학만으로 국적이 결정되지는 않습니다. 지원자 분류, 연방 재정보조, 입국 서류는 국적·이민 신분과 대학 규정에 따라 달라집니다. 신분을 입력하기 전에는 ‘국적에 따라 다름’으로 표시합니다.",
  "canadian-entry":
    "캐나다 시민권자는 일반적으로 학생 입국을 위한 F-1 비자 스탬프가 필요 없지만, 유효한 I-20를 제시하고 학생 신분으로 입국 허가를 받아야 합니다. 최초 I-901 SEVIS 비용도 적용됩니다. 합격 대학의 국제학생 담당 부서와 서류를 확인하세요. 캐나다 영주권은 캐나다 시민권과 다릅니다.",
  "federal-aid":
    "미국 연방 학자금 지원은 일반적으로 미국 시민권 또는 인정되는 비시민권 신분이 필요합니다. 캐나다 시민권만으로는 자격이 생기지 않으며 F-1은 대상 신분이 아닙니다. 캐나다 출생의 일부 원주민 학생 등 예외가 있습니다. 대학 자체 재정보조는 대학별로 따로 확인하세요.",
  "travel-timing":
    "합격 후 진학 대학을 정하면 학교를 통해 I-20를 요청하고 재정 증빙, 필요한 SEVIS 비용, 국적별 비자·입국 절차를 확인하세요. 항공편 예약 전 2028년 정부 규정을 다시 확인하세요.",
};
for (const fact of planning.facts) contentKo[fact.text] = facts[fact.id];
contentKo[pathways.facts[0].text] =
  "캘리포니아 커뮤니티 칼리지에서 시작해 UC로 편입하는 것은 별도의 전략입니다. TAG에는 6개 캠퍼스가 참여하며 캠퍼스별 조건이 있습니다. 신입학 경로가 아니고 모든 UC나 전공의 합격을 보장하지 않습니다. 2028년 가을 커뮤니티 칼리지를 시작하면 대학 편입은 그보다 나중입니다. 국제학생 자격, 비용, 편입 인정 과목, 해당 편입 연도의 약정을 상담 교사와 확인하세요.";

const apKo: Record<string, Record<string, string>> = {
  "english-language": {
    name: "AP 영어 언어와 작문 (English Language)",
    reason:
      "논증, 자료 평가, 글 수정 능력은 인문·사회과학 학업과 지원 에세이 작성에 도움이 됩니다.",
    difficulty:
      "작문 중심의 학습량이 많습니다. 정성적인 학습량 설명이며 공식 난이도 순위가 아닙니다.",
    timing:
      "작문 실력이 탄탄하고 수업·응시 학교를 확보했다면 11학년, 그렇지 않다면 12학년에 고려하세요.",
    target: "현재 ASU 예시에서는 4~5점 목표 · 입학 필수 요건 아님",
    credit:
      "ASU는 현재 4~5점에 선택 3학점과 ENG 105 배치를 인정합니다. 신입생에게 ENG 101 학점이 자동 부여되는 것은 아닙니다.",
  },
  statistics: {
    name: "AP 통계학 (Statistics)",
    reason: "자료 분석은 사회과학, 심리학, 경영학 탐색에 도움이 됩니다.",
    difficulty:
      "수리적 추론과 서술형 설명이 필요합니다. 현재 권장 선수 과정은 기초 대수학 1년입니다.",
    timing:
      "적절한 대수학 준비 후 11학년 또는 12학년에 고려하세요. 2026~27년 교육과정 체계를 사용하세요.",
    target:
      "현재 ASU 학점은 3점 이상 · 다른 대학의 선택지를 위해 4~5점을 고려하되 대학별 표 확인",
    credit: "ASU는 현재 3·4·5점에 STP 226의 3학점을 인정합니다.",
  },
  psychology: {
    name: "AP 심리학 (Psychology)",
    reason:
      "심리학, 사회학 또는 폭넓은 사회과학에 관심 있는 학생에게 연결성이 있는 선택입니다.",
    difficulty:
      "다양한 개념과 연구 해석을 공부해야 합니다. College Board의 공식 선수 과목은 없지만 쉬운 과목이라는 뜻은 아닙니다.",
    timing:
      "학습 지원이 있고 감당할 수 있다면 11학년, 아니면 12학년에 고려하세요.",
    target: "현재 ASU 예시에서는 4~5점 목표 · 입학 필수 요건 아님",
    credit: "ASU는 현재 4~5점에 PSY 101의 3학점을 인정합니다.",
  },
  microeconomics: {
    name: "AP 미시경제학 (Microeconomics)",
    reason:
      "수요·공급, 소비자와 기업의 의사결정, 시장 구조를 배워 경제학·경영학·사회과학 탐색에 도움이 됩니다.",
    difficulty:
      "경제 모형, 그래프와 서술형 설명을 꾸준히 연습해야 합니다. 학습량에 대한 편집 조언이며 공식 난이도 순위가 아닙니다.",
    timing:
      "경제 그래프를 연습할 시간이 있고 수업 또는 응시 학교를 확보했다면 11학년이나 12학년에 고려하세요.",
    target:
      "학습 목표로 4~5점 고려 · 입학 필수 요건이나 모든 대학의 공통 학점 기준은 아님",
    credit:
      "응시 등록 전에 대학별 미시경제학 학점표와 학위 요건을 확인하세요. 특정 학점 인정을 전제로 하지 않습니다.",
  },
};
for (const ap of planning.apPriorities)
  for (const [key, value] of Object.entries(apKo[ap.id]))
    contentKo[ap[key as keyof typeof ap] as string] = value;
for (const ap of planning.apPriorities)
  contentKo[`${ap.target}. ${ap.credit}`] =
    `${apKo[ap.id].target}. ${apKo[ap.id].credit}`;
const resourceKo = [
  [
    "공식 시험 앱으로 현재 실력을 파악하고 오답을 검토한 뒤 교재 구입을 결정하세요.",
    "SAT 진단과 시간 제한 연습",
  ],
  [
    "Bluebook 결과와 함께 사용해 필요한 영역에 집중하세요.",
    "SAT 약점별 학습과 연습",
  ],
  [
    "독해가 구체적인 약점일 때 선택하세요. 공식 연습 자료를 보완하는 교재입니다.",
    "SAT 읽기·쓰기 영역의 독해 능력",
  ],
  [
    "문법·문장부호를 체계적으로 공부해야 할 때 선택하세요. Meltzer 교재 두 권을 무조건 모두 살 필요는 없습니다.",
    "SAT 읽기·쓰기 영역의 문법과 표기 규칙",
  ],
  [
    "출판사는 개편된 통계학 교육과정 반영을 확인합니다. 공식 수업 자료를 먼저 사용하세요.",
    "AP 통계학 복습",
  ],
  [
    "현재 출판사 판본에 디지털 시험 연습과 주제별 복습이 포함됩니다.",
    "AP 심리학 복습",
  ],
  [
    "유료 교재를 고르기 전에 공식 과목·시험 설명과 공개된 서술형 문제를 읽어 보세요.",
    "AP 교육과정과 무료 시험 연습",
  ],
  [
    "2027년 여름에 단계별 연습으로 본인의 목소리가 담긴 초안을 만드세요. 유료 교재는 필수가 아닙니다.",
    "에세이 아이디어 정리와 초안 작성",
  ],
  [
    "출판사에 등재된 구입 가능한 판본입니다. 새 ISBN 9781464234248 판본은 2026년 11월 10일 출간 예정이며, 10월 21일 기준 예약 판매 중이었습니다. 이미 출간된 것으로 표시하지 않습니다.",
    "에세이 아이디어·구조·수정",
  ],
];
planning.resources.forEach((resource, i) => {
  contentKo[resource.reason] = resourceKo[i][0];
  contentKo[resource.purpose] = resourceKo[i][1];
});
Object.assign(
  contentKo,
  Object.fromEntries(
    `
Session 1; coordinator confirms reporting time	1회차 · 집합 시간은 담당자에게 확인
Session 2; coordinator confirms reporting time	2회차 · 집합 시간은 담당자에게 확인
Start here — free	무료 자료부터 시작
Optional, after diagnostic	선택 · 진단 후 고려
Optional, targeted purchase	선택 · 약점 보완용
Optional, only if taking AP Statistics	선택 · AP 통계학 응시 시
Optional, only if taking AP Psychology	선택 · AP 심리학 응시 시
Optional; library/used copy sufficient	선택 · 도서관·중고책도 충분
Current online resource	현재 온라인 자료
Current Digital SAT course	현재 Digital SAT 과정
6th edition — Digital SAT	제6판 · Digital SAT
2027 edition; published July 7, 2026; ISBN 9798349701566	2027년판 · 2026년 7월 7일 출간 · ISBN 9798349701566
24th edition; published August 4, 2026; ISBN 9798217125159	제24판 · 2026년 8월 4일 출간 · ISBN 9798217125159
2026–27 course pages; choose your subject	2026~27년 과목 페이지 · 응시 과목 선택
Current web guide	현재 웹 가이드
2016 edition; ISBN 9781492635123	2016년판 · ISBN 9781492635123
Verified	확인됨
verified	확인됨
verified current	현재 정보 확인됨
needs confirmation	확인 필요
2028 not yet published	2028년 정보 미발표
conflicting components	세부 항목 간 불일치
Partial verification; confirm unknowns	일부 확인 · 미확인 항목 문의 필요
Verified current policy	현재 정책 확인됨
calculated official counts	공식 인원 수로 계산
historical reference	과거 주기 참고 정보
partially verified	일부 확인됨
verified cohort	해당 학생 집단 확인됨
2026–2027 reference; total calculated from official components	2026~27년 참고 · 공식 세부 비용을 합산한 총액
Current policy; 2028 unconfirmed	현재 정책 · 2028년 미확정
editorial inference	편집상 추론
Confirm directly with Admissions	입학처에 직접 확인
confirm	확인 필요
year unconfirmed	적용 연도 미확인
verified with caveat	유의사항과 함께 확인됨
conflicting cycle pages	지원 주기 페이지 간 상충
editorial	편집 판단
future unpublished	향후 정보 미발표
Verified structure; editorial major suggestions	구조 확인 · 전공 제안은 편집 판단
Not verified	미확인
not verified	미확인
Verified current credit policy	현재 학점 인정 정책 확인됨
Planning guidance	준비 계획 안내
Planning guidance — university specific sources required	준비 계획 안내 · 대학별 출처 확인 필요
Anticipated / Not yet published	예상 / 아직 미발표
Not yet published	아직 미발표
Verified facts with planning distinction	사실 확인 · 준비 방식 구분
Verified with planning distinction	확인됨 · 준비 요건 구분
Verified form guidance / planning rule	공식 양식 안내 확인 / 준비 원칙
Alternative pathway — separate from direct admission	대안 경로 · 신입학과 별개
Public research university	공립 연구중심 대학교
Private research university	사립 연구중심 대학교
`
      .trim()
      .split("\n")
      .map((line) => line.split("\t")),
  ),
);

for (const e of expandedEvidence) {
  const university = universities.find((u) => u.id === e.id)!;
  contentKo[university.name] = e.ko.name;
  contentKo[e.fit] = e.ko.fit;
  if (e.ko.structure) contentKo[e.structure] = e.ko.structure;
  e.majors.forEach((m, i) => {
    if (e.ko.majorNames[i]) contentKo[m] = e.ko.majorNames[i];
  });
}
Object.assign(contentKo, {
  "Research reviewed: October 21–22, 2026. Admission policies and deadlines can change. Always confirm final requirements on the university’s official admissions website before applying.":
    "조사일: 2026년 10월 21~22일. 입학 정책과 마감일은 바뀔 수 있으므로 지원 전 각 대학 공식 사이트에서 최종 요건을 확인하세요.",
  "Fall 2028 entry: do not reuse reference-cycle deadlines as your application deadlines. Confirm the testing policy for the selected school and Fall 2028.":
    "2028년 가을 입학: 과거 주기의 날짜를 지원 마감일로 사용하지 마세요. 선택한 학교의 2028년 시험 정책을 확인하세요.",
  "Fall 2028 entry: do not reuse reference-cycle deadlines as your application deadlines. Read the school-specific test requirement and applicable entry year below.":
    "2028년 가을 입학: 과거 주기의 날짜를 지원 마감일로 사용하지 마세요. 아래 학교별 시험 요건과 적용 연도를 확인하세요.",
  "Liberal Arts": "문리대",
  Education: "교육대",
  Engineering: "공대",
  "College of Liberal Arts": "문리대",
  "College of Education": "교육대",
  "College of Engineering": "공대",
});
Object.assign(contentKo, {
  "SAS · Fall 2026 admitted score submitters":
    "문리대(SAS) · 2026년 가을 합격자 중 점수 제출자",
  "Storrs · Fall 2026 admitted score submitters":
    "스토어스 · 2026년 가을 합격자 중 점수 제출자",
  "Fall 2025 enrolled score submitters · 1,322 scored students":
    "2025년 가을 등록자 중 점수 제출자 · 1,322명",
  "Fall2025 enrolled first-year SAT submitters;55% submitted SAT":
    "2025년 가을 등록 신입생 중 SAT 제출자 · 제출 비율 55%",
  "Fall2026 published profile, West Lafayette+Indianapolis combined; admitted-score table":
    "2026년 가을 합격자 점수 표 · 웨스트라피엣과 인디애나폴리스 합산",
  "Fall2026 class profile; West Lafayette+Indianapolis college aggregate, not a major cutoff":
    "2026년 가을 단과대별 집단 · 웨스트라피엣과 인디애나폴리스 합산 · 전공 합격선 아님",
  "Fall 2026 admitted freshman applicants who submitted scores; university overall":
    "2026년 가을 합격 신입생 중 점수 제출자 · 대학 전체",
  "Fall 2026 admitted College of Liberal Arts applicants who submitted scores":
    "2026년 가을 문리대 합격자 중 점수 제출자",
  "Fall 2025 enrolled first-year SAT submitters; 7.1% submitted":
    "2025년 가을 등록 신입생 중 SAT 제출자 · 제출 비율 7.1%",
  "Fall 2025 enrolled first-year SAT submitters; 19% submitted":
    "2025년 가을 등록 신입생 중 SAT 제출자 · 제출 비율 19%",
  Wisconsin: "위스콘신",
  Minnesota: "미네소타",
  Kansas: "캔자스",
  Alabama: "앨라배마",
  Connecticut: "코네티컷",
  Massachusetts: "매사추세츠",
  "New Jersey": "뉴저지",
  Ohio: "오하이오",
});

for (const range of researchedSatRanges)
  contentKo[range.cohort] = range.cohortKo;
