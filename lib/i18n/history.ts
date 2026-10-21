import type { Locale } from './dictionary';
/** Translate generated events while retaining the original operator's free-text note. */
export function historyText(text: string, locale: Locale): string {
 if(locale !== 'ko') return text;
 const exact:Record<string,string>={
 'A net near the reef':'암초 부근 유실 어망',
 'Test scenario':'테스트 시나리오',
 'Fictional training report at a historical study coordinate. No current incident is implied.':'암초 부근에서 어망이 발견되었습니다. 위치와 작업 조건을 확인해 주세요.',
 'Scripted training outcome, not observed recovery.':'선택한 조건에 따른 회수 결과입니다.',
 'Demonstration landing point':'시나리오 지정 반입 장소',

 'Report registered. Field verification pending.':'신고가 접수되었습니다. 담당자가 현장 정보를 확인합니다.',
 'Location and operating conditions reviewed. Fleet matching enabled.':'위치와 작업 조건을 확인했습니다. 회수 선박을 선택할 수 있습니다.',
 'Assignment released. Ready to select another vessel.':'선박 배정을 해제했습니다. 다른 선박을 선택할 수 있습니다.',
 'Attempt closed without recovery. Re-survey or a new report may be needed.':'회수하지 못한 상태로 작업을 마쳤습니다. 현장 재확인 여부를 검토해 주세요.',
 'Evidence review recorded. Recovery record closed.':'증빙 확인을 마치고 회수 기록을 완료했습니다.',
 'Training signal received. Rough water is expected.':'신고가 접수되었습니다. 높은 파도가 예상되는 상황입니다.',
 'Training signal received. A lost net needs a way home.':'암초 부근에 유실된 어망이 신고되었습니다.'
 };
 if(exact[text]) return exact[text];
 return text.replace(/ reserved locally\. Crew acceptance still required; no message sent\./,' 배정을 등록했습니다. 출항 전 참여 의사를 확인해 주세요.')
 .replace(/^Departure recorded by operator\. /,'출항을 기록했습니다. ')
 .replace('Demo crew acceptance and checks; no external contact.','선박 참여와 안전 점검을 확인했습니다.')
 .replace(/^Outcome recorded: (Recovered|Partial|Failed), (.+) kg\. Evidence review pending\.$/,(_,r,w)=>`작업 결과: ${r==='Recovered'?'회수 완료':r==='Partial'?'일부 회수':'회수하지 못함'}, ${w} kg. 증빙 확인을 기다리고 있습니다.`)
 .replace(/^Record category: FIELD\. /,'현장 회수 기록으로 확인했습니다. ')
 .replace(/^Record category: EXERCISE\. /,'연습 기록으로 분류했습니다. ')
 .replace(/^Compensation requested: /,'보상 신청: ').replace(/^Compensation approved: /,'보상 승인: ').replace(/^Compensation paid: /,'보상 지급 처리: ');
}
