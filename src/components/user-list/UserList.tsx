import { useCallback, useEffect, useState, useMemo } from 'react';
import { Button, Input, Table, Pagination, Select, Card, Checkbox } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import './UserList.css';

type UserData = {
	limit: number;
	skip: number;
	total: number;
	users: User[];
};

function UserList() {
	const [users, setUsers] = useState<User[]>([]);
	const [totalUsers, setTotalUsers] = useState<number>(0);
	const [search, setSearch] = useState<string>('');
	const [skip, setSkip] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [selectedCity, setSelectedCity] = useState<string | null>(null);
	const [highlightOldest, setHighlightOldest] = useState<boolean>(false);
	const [cities, setCities] = useState<string[]>([]);
	const [debouncedSearch] = useDebounce(search, 1000);

	const fetchUsers = useCallback(async () => {
		setIsLoading(true);
		try {
			const cityQuery = selectedCity ? `&city=${selectedCity}` : '';
			const res = await axios.get(
				`https://dummyjson.com/users/search?q=${debouncedSearch}&limit=1000&skip=${skip}${cityQuery}`
			);
			const data: UserData = res.data;
			setUsers(data.users);
			setTotalUsers(data.total);
			if (!selectedCity) {
				const uniqueCities = Array.from(
					new Set(data.users.map((user) => user.address.city))
				);
				setCities(uniqueCities);
			}
			setIsLoading(false);
		} catch (error) {
			console.log(error);
		}
	}, [skip, debouncedSearch, selectedCity]);

	useEffect(() => {
		fetchUsers();
	}, [skip, debouncedSearch, selectedCity, currentPage]);

	const handleSearch = (query: string) => {
		setSearch(query);
		setSkip(0);
		setCurrentPage(1);
	};

	const handleOnPageChange = (page: number) => {
		setSkip(10 * (page - 1));
		setCurrentPage(page);
	};

	const filteredUsers = useMemo(() => {
		let usersToFilter = users;
		if (selectedCity) {
			usersToFilter = users.filter(
				(user) => user.address.city === selectedCity
			);
		}
		if (highlightOldest) {
			const oldestUsers = usersToFilter.reduce(
				(acc: { [key: string]: User }, user: User) => {
					const city = user.address.city;
					if (
						!acc[city] ||
						new Date(user.birthDate) < new Date(acc[city].birthDate)
					) {
						acc[city] = user;
					}
					return acc;
				},
				{} as { [key: string]: User }
			);
			usersToFilter = usersToFilter.map((user) => ({
				...user,
				isOldest: oldestUsers[user.address.city]?.id === user.id,
			}));
		}
		return usersToFilter;
	}, [users, selectedCity, highlightOldest]);

	const paginationUsers = useMemo(() => {
		const start = (currentPage - 1) * 10;
		const end = start + 10;
		return filteredUsers.slice(start, end);
	}, [filteredUsers, currentPage]);

	const columns = [
		{
			title: 'Name',
			dataIndex: ['firstName', 'lastName'],
			render: (_: any, record: User) => (
				<div>
					{record.firstName} {record.lastName}
				</div>
			),
		},
		{
			title: 'City',
			dataIndex: 'address.city',
			render: (_: any, record: User) => <div>{record.address.city}</div>,
		},
		{
			title: 'Birthday',
			dataIndex: 'birthDate',
			render: (_: any, record: User) => (
				<div>{new Date(record.birthDate).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<Card
			className="user-list-container"
			title={
				<div className="user-filters">
					<div className="search-bar-container">
						<label>Name</label>
						<Input
							placeholder="Search User"
							className="search-input"
							onChange={(event) =>
								handleSearch(event.target.value)
							}
							suffix={
								<Button
									className="button-input"
									type="primary"
									shape="circle"
									icon={<SearchOutlined />}
								/>
							}
						/>
					</div>
					<div className="select-city-input">
						<label>City</label>
						<Select
							placeholder="Select city"
							className="city-filter"
							onChange={(value) => {
								setSelectedCity(value);
								setSkip(0);
								setCurrentPage(1);
							}}
							allowClear
						>
							{cities.map((city) => (
								<Select.Option key={city} value={city}>
									{city}
								</Select.Option>
							))}
						</Select>
					</div>
					<div className="check-older-cities">
						<label>Highlight oldest per city</label>
						<Checkbox
							checked={highlightOldest}
							onChange={(e) =>
								setHighlightOldest(e.target.checked)
							}
						/>
					</div>
				</div>
			}
		>
			<Table
				className="user-table"
				pagination={{ position: ['none', 'none'] }}
				columns={columns}
				dataSource={selectedCity ? paginationUsers : filteredUsers}
				loading={isLoading}
				rowClassName={(record) =>
					record.isOldest ? 'highlight-row' : ''
				}
			/>
			<Pagination
				className="pagination"
				showSizeChanger={false}
				current={currentPage}
				total={selectedCity ? filteredUsers.length : totalUsers}
				onChange={handleOnPageChange}
			/>
		</Card>
	);
}

export default UserList;
