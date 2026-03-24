import React from "react";
import LoginForm from "./components/LoginForm";

const LoginPage = () => {
	return (
		<div className="flex flex-col items-center justify-center h-screen w-full bg-slate-800">
			<h1 className="text-white font-extrabold text-2xl">คาราเมโล POS</h1>
			<div className="bg-slate-50 grid place-items-center rounded-lg bg-opacity-10 h-[400px] w-[350px]">
				<LoginForm />
			</div>
		</div>
	);
};

export default LoginPage;
