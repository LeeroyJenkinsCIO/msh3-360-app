import React from 'react';
import { Book, FileText, Users, Target, Zap, ExternalLink } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

function WikiPage() {
  const { user } = useAuth();

  const wikiSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'New to MSH³? Start here to understand the fundamentals',
      icon: Zap,
      color: 'msh-blue',
      articles: [
        { title: 'What is MSH³?', status: 'available' },
        { title: 'Understanding the 360 Assessment', status: 'available' },
        { title: 'Your First 1x1 Assessment', status: 'available' },
        { title: 'Navigating IS OS Hub', status: 'available' }
      ]
    },
    {
      id: 'assessment-guides',
      title: 'Assessment Guides',
      description: 'Step-by-step guides for conducting effective assessments',
      icon: FileText,
      color: 'msh-purple',
      articles: [
        { title: 'How to Score: 0-2 Scale Explained', status: 'available' },
        { title: 'Understanding the Nine-Box Model', status: 'available' },
        { title: 'Best Practices for 1x1 Reviews', status: 'available' },
        { title: 'Interpreting Composite Scores', status: 'available' }
      ]
    },
    {
      id: 'msh-framework',
      title: 'MSH³ Framework',
      description: 'Deep dive into Mindset, Skillset, and Habits',
      icon: Target,
      color: 'msh-indigo',
      articles: [
        { title: 'Culture Pillar: Mindset, Social, Habits', status: 'available' },
        { title: 'Competencies Pillar: Skills & Knowledge', status: 'available' },
        { title: 'Execution Pillar: Delivery & Results', status: 'available' },
        { title: 'Contribution vs Growth Dimensions', status: 'available' }
      ]
    },
    {
      id: 'for-leaders',
      title: 'For Leaders',
      description: 'Resources for ISL and ISE team leads',
      icon: Users,
      color: 'competencies',
      articles: [
        { title: 'Leading Effective 1x1 Conversations', status: 'coming-soon' },
        { title: 'Team Performance Analytics', status: 'coming-soon' },
        { title: 'Development Planning Strategies', status: 'coming-soon' },
        { title: 'Coaching Through Misalignment', status: 'coming-soon' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Book className="w-10 h-10 text-msh-blue" />
            <h1 className="text-4xl font-bold text-neutral-dark">MSH³ Wiki</h1>
          </div>
          <p className="text-lg text-neutral">
            Your comprehensive guide to the MSH³ 360 performance assessment system
          </p>
          <p className="text-sm text-neutral mt-2">
            Mindset • Skillset • Habits — at the Speed of Scale
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-msh-blue">
            <h3 className="font-bold text-neutral-dark mb-2">Quick Reference</h3>
            <p className="text-sm text-neutral mb-3">
              Common questions and quick answers
            </p>
            <Button variant="ghost" size="sm" className="text-msh-blue">
              View FAQ
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-msh-purple">
            <h3 className="font-bold text-neutral-dark mb-2">Video Tutorials</h3>
            <p className="text-sm text-neutral mb-3">
              Watch step-by-step walkthroughs
            </p>
            <Button variant="ghost" size="sm" className="text-msh-purple">
              Watch Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-l-4 border-msh-indigo">
            <h3 className="font-bold text-neutral-dark mb-2">Need Help?</h3>
            <p className="text-sm text-neutral mb-3">
              Contact the IS team for support
            </p>
            <Button variant="ghost" size="sm" className="text-msh-indigo">
              Get Support
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>

        {/* Wiki Sections */}
        <div className="space-y-6">
          {wikiSections.map((section) => {
            const IconComponent = section.icon;
            
            return (
              <Card key={section.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`bg-${section.color} bg-opacity-10 p-3 rounded-lg`}>
                    <IconComponent className={`w-6 h-6 text-${section.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-neutral-dark mb-2">
                      {section.title}
                    </h2>
                    <p className="text-neutral">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.articles.map((article, index) => (
                    <button
                      key={index}
                      className="text-left p-3 border border-neutral-light rounded-lg hover:border-msh-blue hover:bg-blue-50 transition-all group"
                      disabled={article.status === 'coming-soon'}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-dark group-hover:text-msh-blue">
                          {article.title}
                        </span>
                        {article.status === 'coming-soon' ? (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        ) : (
                          <ExternalLink className="w-4 h-4 text-neutral group-hover:text-msh-blue" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <Card className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-neutral">
          <div className="text-center">
            <h3 className="font-bold text-neutral-dark mb-2">
              Can't find what you're looking for?
            </h3>
            <p className="text-sm text-neutral mb-4">
              The wiki is continuously updated with new content and resources
            </p>
            <Button variant="secondary">
              Request New Content
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}

export default WikiPage;