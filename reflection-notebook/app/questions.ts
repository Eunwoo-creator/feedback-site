export const defaultQuestions=[
 '오늘 배운 내용을 자기 말로 설명해 보세요.',
 '오늘 수업에서 재미있었거나 흥미로웠던 점에 대해 이야기해 주세요!',
 '아직 헷갈리는 점은 무엇인가요?',
 '선생님들에게 바라는 점이 있나요?'
];
export type Revision={id:string;number:number;questions:string[];answers:string[];feedback:string;created:number;feedbackAt:number|null};
export type Student={id:string;name:string;pin:string;created:number;revisions:Revision[]};
export type Notebook={role:'teacher'|'student';lesson:{code:string;title:string;questions:string[]};students:Student[]};
