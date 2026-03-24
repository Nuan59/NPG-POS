import { getEmployees } from "@/services/EmployeeService";
import React from "react";
import EmployeesView from "./views/EmployeesView";

const Employees = async () => {
	const employees = await getEmployees();

	return <EmployeesView employees={employees} />;
};

export default Employees;
