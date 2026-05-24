export interface IEmployeePermissions {
  sale: boolean;
  inventory: boolean;
  customer: boolean;
  registration: boolean;
  npg: boolean;
  board: boolean;
}

export interface IEmployee {
  id?: number;
  name: string;
  username: string;
  password?: string;
  role: "adm" | "emp";
  permissions?: IEmployeePermissions;
}