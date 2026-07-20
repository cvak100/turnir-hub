export interface StatusRef {
  id: number;
  name: string;
  code: string;
  color: string;
}

export interface PersonMinimal {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
}

export interface SportRef {
  id: number;
  name: string;
}

export interface NamedEntity {
  id: number;
  name: string;
}
