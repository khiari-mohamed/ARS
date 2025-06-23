import React from 'react';

interface UserTagProps {
  name: string;
  role: string;
}

const UserTag: React.FC<UserTagProps> = ({ name, role }) => (
  <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 mr-2">
    {name} <span className="ml-1 text-gray-400">({role})</span>
  </span>
);

export default UserTag;
