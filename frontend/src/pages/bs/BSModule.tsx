import React, { useState, useEffect } from 'react';
import { Layout, Menu, Breadcrumb, Button, Drawer } from 'antd';
import { 
  DashboardOutlined,
  FileTextOutlined,
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
  MenuOutlined
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    {
      key: '/home/bs',
      icon: <DashboardOutlined />,
      label: 'Tableau de bord',
      onClick: () => {
        navigate('/home/bs');
        if (isMobile) setMobileMenuOpen(false);
      }
    },
    {
      key: '/home/bs/list',
      icon: <FileTextOutlined />,
      label: 'Liste des BS',
      onClick: () => {
        navigate('/home/bs/list');
        if (isMobile) setMobileMenuOpen(false);
      }
    },
    {
      key: '/home/bs/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytiques',
      onClick: () => {
        navigate('/home/bs/analytics');
        if (isMobile) setMobileMenuOpen(false);
      }
    },
    {
      key: '/home/bs/ai',
      icon: <RobotOutlined />,
      label: 'IA & Suggestions',
      onClick: () => {
        navigate('/home/bs/ai');
        if (isMobile) setMobileMenuOpen(false);
      }
    },
    {
      key: '/home/bs/tuniclaim',
      icon: <CloudDownloadOutlined />,
      label: 'MY TUNICLAIM',
      onClick: () => {
        navigate('/home/bs/tuniclaim');
        if (isMobile) setMobileMenuOpen(false);
      }
    }
  ];

  // Add role-specific menu items
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    menuItems.push({
      key: '/home/bs/admin',
      icon: <SettingOutlined />,
      label: 'Administration',
      onClick: () => {
        navigate('/home/bs/admin');
        if (isMobile) setMobileMenuOpen(false);
      }
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
      {/* Desktop Sidebar */}
      {!isMobile && (
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
      )}
      
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title="Bulletin de Soins"
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          bodyStyle={{ padding: 0 }}
          width={250}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </Drawer>
      )}
      
      <Layout>
        <Content style={{ margin: isMobile ? '0 8px' : '0 16px' }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <div style={{ 
              padding: '16px 0', 
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Button 
                type="primary" 
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                size="large"
                style={{ 
                  minWidth: '140px',
                  height: '40px'
                }}
              >
                Menu BS
              </Button>
            </div>
          )}
          <Breadcrumb 
            items={getBreadcrumbItems()}
            style={{ margin: '16px 0' }}
          />
          
          <div style={{ 
            padding: isMobile ? 12 : 24, 
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