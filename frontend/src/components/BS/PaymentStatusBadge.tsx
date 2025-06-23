// src/components/BS/PaymentStatusBadge.tsx
import { Tag } from 'antd';
import React from 'react';

export const PaymentStatusBadge: React.FC<{ status: 'PAID' | 'PENDING' | 'UNPAID' }> = ({ status }) => (
  <Tag color={status === 'PAID' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
    {status === 'PAID' ? 'Payé' : status === 'PENDING' ? 'En attente' : 'Non payé'}
  </Tag>
);