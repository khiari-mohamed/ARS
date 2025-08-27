import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb } from 'antd';
import { 
  DashboardOutlined,
  FileTextOutlined,
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BSWorkflowRouter } from '../../components/BS/BSWorkflowRouter';
import BSListPage from './BSListPage';
import { BSDetailsPage } from './BSDetailsPage';
import { BSProcessingPage } from './BSProcessingPage';
import { TuniclaimSync } from '../../components/BS/TuniclaimSync';
import BSAnalyticsPage from './BSAnalyticsPage';
import BSAIPage from './BSAIPage';
import { useAuth } from '../../contexts/AuthContext';

const { Content, Sider } = Layout;

const BSModule: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      key: '/home/bs',
      icon: <DashboardOutlined />,
      label: 'Tableau de bord',
      onClick: () => navigate('/home/bs')
    },
    {
      key: '/home/bs/list',
      icon: <FileTextOutlined />,
      label: 'Liste des BS',
      onClick: () => navigate('/home/bs/list')
    },
    {
      key: '/home/bs/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytiques',
      onClick: () => navigate('/home/bs/analytics')
    },
    {
      key: '/home/bs/ai',
      icon: <RobotOutlined />,
      label: 'IA & Suggestions',
      onClick: () => navigate('/home/bs/ai')
    },
    {
      key: '/home/bs/tuniclaim',
      icon: <CloudDownloadOutlined />,
      label: 'MY TUNICLAIM',
      onClick: () => navigate('/home/bs/tuniclaim')
    }
  ];

  // Add role-specific menu items
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    menuItems.push({
      key: '/home/bs/admin',
      icon: <SettingOutlined />,
      label: 'Administration',
      onClick: () => navigate('/home/bs/admin')
    });
  }

  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [{ title: 'Accueil' }];
    
    if (pathSegments.includes('bs')) {
      items.push({ title: 'Bulletin de Soins' });
      
      if (pathSegments.includes('list')) {
        items.push({ title: 'Liste' });
      } else if (pathSegments.includes('analytics')) {
        items.push({ title: 'Analytiques' });
      } else if (pathSegments.includes('ai')) {
        items.push({ title: 'IA & Suggestions' });
      } else if (pathSegments.includes('processing')) {
        items.push({ title: 'Traitement' });
      } else if (pathSegments.length > 2) {
        items.push({ title: 'Détails' });
      }
    }
    
    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
        width={250}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {collapsed ? 'BS' : 'Bulletin de Soins'}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb 
            items={getBreadcrumbItems()}
            style={{ margin: '16px 0' }}
          />
          
          <div style={{ 
            padding: 24, 
            minHeight: 360, 
            background: '#fff',
            borderRadius: 6
          }}>
            <Routes>
              {/* Main dashboard - role-based routing */}
              <Route path="/" element={<BSWorkflowRouter />} />
              
              {/* BS List and management */}
              <Route path="/list" element={<BSListPage />} />
              <Route path="/:id" element={<BSDetailsPage />} />
              <Route path="/:id/processing" element={<BSProcessingPage />} />
              
              {/* Analytics and AI */}
              <Route path="/analytics" element={<BSAnalyticsPage />} />
              <Route path="/ai" element={<BSAIPage />} />
              
              <Route path="/tuniclaim" element={<TuniclaimSync />} />
              
              {/* Admin interface */}
              <Route path="/admin" element={
                <div>
                  <h2>Administration BS</h2>
                  <p>Interface d'administration en cours de développement...</p>
                </div>
              } />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default BSModule;