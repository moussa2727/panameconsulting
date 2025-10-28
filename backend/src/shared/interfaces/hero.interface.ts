// interfaces/hero.interface.ts
export interface Hero {
   id: string;
   slogan: string;
   title: string;
   description: string;
   countriesCount: number;
   studentsCount: number;
   expertise?: string;
   statistics?: string;
   mainTitle?: string;
}
export interface HeroData {
   id: string;
   slogan: string;
   title: string;
   description: string;
   countriesCount: number;
   studentsCount: number;
   expertise?: string;
   statistics?: string;
   mainTitle?: string;
}
