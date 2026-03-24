"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import React, { SyntheticEvent, useState } from "react";
import { toast } from "sonner";

const LoginForm = () => {
	const [user, setUser] = useState<string>("");
	const [pass, setPass] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const router = useRouter();

	const handleSubmit = async (event: SyntheticEvent) => {
		setIsLoading(true);
		event.preventDefault();

		const res = await signIn("credentials", {
			username: user,
			password: pass,
			redirect: false,
		});

		if (res?.error) {
			if (res?.error === "CredentialsSignin") {
				toast.error("Invalid credentials", {
					description: "Username or password is incorrect",
				});
				setIsLoading(false);
				return;
			} else {
				toast.error("Unexpected error");
				setIsLoading(false);
				return;
			}
		}
		toast.success("Logged in successfully!");
		router.push("/dashboard");
		setIsLoading(false);
	};

	return (
		<form
			id="loginform"
			onSubmit={handleSubmit}
			className="flex flex-col items-center justify-center gap-2"
		>
			<div className="flex items-center relative">
				<User className="absolute left-1" size={"1.2rem"} opacity={"60%"} />
				<Input
					placeholder="Username"
					className="bg-white pl-7"
					value={user}
					onChange={(e) => setUser(e.target.value)}
				/>
			</div>

			<div className="flex items-center relative">
				<Lock className="absolute left-1" size={"1.2rem"} opacity={"60%"} />
				<Input
					placeholder="Password"
					className="bg-white pl-7"
					value={pass}
					type="password"
					onChange={(e) => setPass(e.target.value)}
				/>
			</div>

			<Button
				type="submit"
				form="loginform"
				className="flex items-center justify-center"
			>
				{!isLoading ? (
					"Login"
				) : (
					<Loader2 size={"1.2rem"} className="animate-spin" />
				)}
			</Button>
		</form>
	);
};

export default LoginForm;
